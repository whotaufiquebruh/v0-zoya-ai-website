import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, PhoneOff, X } from "lucide-react"

type CallStatus = "connecting" | "listening" | "processing" | "speaking" | "error" | "idle"

interface VoiceCallModalProps {
  isOpen: boolean
  onClose: () => void
  initialStream: MediaStream | null
  onTranscript?: (text: string, isUser: boolean) => void
}

const SPEECH_THRESHOLD   = 0.013  // mic RMS → speech
const SILENCE_THRESHOLD  = 0.007  // mic RMS → silence
const SILENCE_DURATION   = 1100   // ms quiet after speech → auto-stop
const INTERRUPT_THRESHOLD = 0.018 // RMS during Zoya speech → interrupt her
const MAX_RECORD_MS      = 9000   // hard cap
const BAR_COUNT          = 24

export function VoiceCallModal({ isOpen, onClose, initialStream, onTranscript }: VoiceCallModalProps) {
  const [status, setStatus] = useState<CallStatus>("idle")
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(0.12))
  const [interrupted, setInterrupted] = useState(false)

  // core
  const streamRef          = useRef<MediaStream | null>(null)
  const mediaRecorderRef   = useRef<MediaRecorder | null>(null)
  const chunksRef          = useRef<Blob[]>([])
  const timerRef           = useRef<ReturnType<typeof setInterval> | null>(null)

  // audio playback
  const audioCtxRef        = useRef<AudioContext | null>(null)
  const audioSourceRef     = useRef<AudioBufferSourceNode | null>(null)
  const speakRafRef        = useRef<number | null>(null)

  // VAD (listening phase)
  const analyserRef        = useRef<AnalyserNode | null>(null)
  const micSrcRef          = useRef<MediaStreamAudioSourceNode | null>(null)
  const vadRafRef          = useRef<number | null>(null)
  const silenceTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speechStartedRef   = useRef(false)

  // interrupt VAD (speaking phase)
  const interruptRafRef    = useRef<number | null>(null)
  const interruptCooldownRef = useRef(false)

  // flow
  const isClosingRef       = useRef(false)
  const isPlayingRef       = useRef(false)
  const isRecordingRef     = useRef(false)
  const startRecRef        = useRef<() => void>(() => {})

  // ── utils ────────────────────────────────────────────────────────────────

  const getRMS = (data: Uint8Array) => {
    let s = 0
    for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; s += v * v }
    return Math.sqrt(s / data.length)
  }

  const stopSpeakAnim = useCallback(() => {
    if (speakRafRef.current) { cancelAnimationFrame(speakRafRef.current); speakRafRef.current = null }
  }, [])

  const stopVAD = useCallback(() => {
    if (vadRafRef.current) { cancelAnimationFrame(vadRafRef.current); vadRafRef.current = null }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    speechStartedRef.current = false
  }, [])

  const stopInterruptVAD = useCallback(() => {
    if (interruptRafRef.current) { cancelAnimationFrame(interruptRafRef.current); interruptRafRef.current = null }
  }, [])

  const stopAll = useCallback(() => {
    isClosingRef.current = true
    isPlayingRef.current = false
    isRecordingRef.current = false
    stopVAD(); stopInterruptVAD(); stopSpeakAnim()
    if (mediaRecorderRef.current?.state === "recording") {
      try { mediaRecorderRef.current.stop() } catch { /* noop */ }
    }
    mediaRecorderRef.current = null
    micSrcRef.current?.disconnect(); micSrcRef.current = null
    analyserRef.current?.disconnect(); analyserRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null
    if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null
    try { audioSourceRef.current?.stop() } catch { /* noop */ }
    audioSourceRef.current = null
    audioCtxRef.current?.close().catch(() => {}); audioCtxRef.current = null
    setBars(Array(BAR_COUNT).fill(0.12))
  }, [stopVAD, stopInterruptVAD, stopSpeakAnim])

  // ── interrupt VAD — watches mic while Zoya speaks ─────────────────────────

  const startInterruptVAD = useCallback(() => {
    if (!analyserRef.current) return
    const analyser = analyserRef.current
    const data = new Uint8Array(analyser.fftSize)
    interruptCooldownRef.current = true
    // Brief cooldown so Zoya's first word doesn't self-interrupt
    setTimeout(() => { interruptCooldownRef.current = false }, 600)

    const tick = () => {
      if (isClosingRef.current || !isPlayingRef.current) return
      analyser.getByteTimeDomainData(data)
      const rms = getRMS(data)

      if (!interruptCooldownRef.current && rms > INTERRUPT_THRESHOLD) {
        // User started talking → interrupt Zoya
        stopSpeakAnim()
        stopInterruptVAD()
        try { audioSourceRef.current?.stop() } catch { /* noop */ }
        audioSourceRef.current = null
        isPlayingRef.current = false
        setInterrupted(true)
        setStatus("listening")
        setBars(Array(BAR_COUNT).fill(0.12))
        setTimeout(() => {
          setInterrupted(false)
          if (!isClosingRef.current) startRecRef.current()
        }, 200)
        return
      }
      interruptRafRef.current = requestAnimationFrame(tick)
    }
    interruptRafRef.current = requestAnimationFrame(tick)
  }, [stopSpeakAnim, stopInterruptVAD])

  // ── recording VAD ─────────────────────────────────────────────────────────

  const startVAD = useCallback((mr: MediaRecorder) => {
    if (!analyserRef.current) return
    const analyser = analyserRef.current
    const data = new Uint8Array(analyser.fftSize)

    const tick = () => {
      if (isClosingRef.current || mr.state !== "recording") return
      analyser.getByteTimeDomainData(data)
      const rms = getRMS(data)

      // Live waveform from real mic data
      const newBars = Array.from({ length: BAR_COUNT }, (_, i) => {
        const idx = Math.floor((i / BAR_COUNT) * data.length)
        return Math.max(0.06, Math.min(1, Math.abs((data[idx] - 128) / 128) * 4))
      })
      setBars(newBars)

      if (rms > SPEECH_THRESHOLD) {
        speechStartedRef.current = true
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
      } else if (speechStartedRef.current && rms < SILENCE_THRESHOLD && !silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null
          if (mr.state === "recording" && !isClosingRef.current) mr.stop()
        }, SILENCE_DURATION)
      }

      vadRafRef.current = requestAnimationFrame(tick)
    }
    vadRafRef.current = requestAnimationFrame(tick)
  }, [])

  // ── recording ─────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || isClosingRef.current || isPlayingRef.current) return

    if (!streamRef.current || !streamRef.current.getAudioTracks().some(t => t.readyState === "live")) {
      try { streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true }) }
      catch { setStatus("error"); setErrorMsg("Microphone access lost."); return }
    }

    // Wire mic → analyser (no loopback to speakers)
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      if (!analyserRef.current) {
        const a = audioCtxRef.current.createAnalyser()
        a.fftSize = 1024; a.smoothingTimeConstant = 0.55
        analyserRef.current = a
      }
      if (!micSrcRef.current) {
        micSrcRef.current = audioCtxRef.current.createMediaStreamSource(streamRef.current)
        micSrcRef.current.connect(analyserRef.current)
      }
    }

    isRecordingRef.current = true
    speechStartedRef.current = false
    chunksRef.current = []
    setStatus("listening")
    setTranscript("")
    setBars(Array(BAR_COUNT).fill(0.12))

    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"

      const mr = new MediaRecorder(streamRef.current, { mimeType })
      mediaRecorderRef.current = mr

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        isRecordingRef.current = false; stopVAD()
        if (isClosingRef.current || chunksRef.current.length === 0) return
        await processAudio(new Blob(chunksRef.current, { type: mimeType }))
      }
      mr.onerror = () => { isRecordingRef.current = false; setStatus("error"); setErrorMsg("Recording failed.") }

      mr.start(150)
      setTimeout(() => { if (mr.state === "recording") startVAD(mr) }, 250)
      setTimeout(() => { if (mr.state === "recording" && !isClosingRef.current) mr.stop() }, MAX_RECORD_MS)
    } catch {
      isRecordingRef.current = false; setStatus("error"); setErrorMsg("Could not start recording.")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startVAD, stopVAD])

  useEffect(() => { startRecRef.current = startRecording }, [startRecording])

  // ── processAudio ───────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const processAudio = async (blob: Blob) => {
    if (isClosingRef.current) return
    setStatus("processing"); setTranscript("Sunrahi hoon…"); setBars(Array(BAR_COUNT).fill(0.12))

    try {
      const form = new FormData(); form.append("audio", blob, "voice.webm")
      const sttRes = await fetch("/api/voice/stt", { method: "POST", body: form })
      const { transcript: userText } = await sttRes.json()

      if (!userText?.trim()) {
        setTranscript("Kuch sunai nahi… dobara bolo 🙂")
        setStatus("listening")
        setTimeout(() => { if (!isClosingRef.current && !isPlayingRef.current) startRecRef.current() }, 1000)
        return
      }
      if (isClosingRef.current) return
      setTranscript(`"${userText}"`)
      onTranscript?.(userText, true)

      // Fire chat + TTS in parallel as soon as we have the transcript
      const chatPromise = fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, mode: "voice" }),
      }).then(r => r.json())

      const { reply } = await chatPromise
      if (isClosingRef.current) return
      onTranscript?.(reply, false)
      setTranscript(reply)

      const ttsRes = await fetch("/api/voice/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply }),
      })
      if (!ttsRes.ok) throw new Error("TTS failed")

      const ab = await ttsRes.arrayBuffer()
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      if (ctx.state === "suspended") await ctx.resume()
      const buf = await ctx.decodeAudioData(ab)
      if (isClosingRef.current) return

      isPlayingRef.current = true; setStatus("speaking")

      // Speaking waveform animation
      const speakTick = () => {
        if (!isPlayingRef.current) return
        setBars(Array.from({ length: BAR_COUNT }, () => 0.18 + Math.random() * 0.62))
        speakRafRef.current = requestAnimationFrame(speakTick)
      }
      speakRafRef.current = requestAnimationFrame(speakTick)

      const src = ctx.createBufferSource()
      src.buffer = buf; src.connect(ctx.destination); audioSourceRef.current = src

      // Start interrupt detection
      startInterruptVAD()

      src.onended = () => {
        if (!isPlayingRef.current) return // was interrupted
        stopSpeakAnim(); stopInterruptVAD()
        isPlayingRef.current = false; audioSourceRef.current = null
        setBars(Array(BAR_COUNT).fill(0.12))
        if (!isClosingRef.current) {
          setStatus("listening")
          setTimeout(() => { if (!isClosingRef.current && !isPlayingRef.current) startRecRef.current() }, 450)
        }
      }
      src.start(0)
    } catch {
      if (isClosingRef.current) return
      setTranscript("Ek second… kuch issue hua 🥺")
      setStatus("listening")
      setTimeout(() => { if (!isClosingRef.current && !isPlayingRef.current) startRecRef.current() }, 1800)
    }
  }

  // ── startCall ──────────────────────────────────────────────────────────────

  const startCall = useCallback(async () => {
    isClosingRef.current = false
    setStatus("connecting"); setErrorMsg(""); setTranscript(""); setInterrupted(false)
    setBars(Array(BAR_COUNT).fill(0.12))

    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") audioCtxRef.current = new AudioContext()
    if (audioCtxRef.current.state === "suspended") await audioCtxRef.current.resume().catch(() => {})

    if (initialStream?.getAudioTracks().some(t => t.readyState === "live")) {
      streamRef.current = initialStream
    } else {
      try { streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true }) }
      catch { setStatus("error"); setErrorMsg("Microphone access required."); return }
    }

    timerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000)
    setTimeout(() => { if (!isClosingRef.current) startRecRef.current() }, 650)
  }, [initialStream])

  const endCall = useCallback(() => {
    stopAll(); setStatus("idle"); setCallDuration(0); setTranscript(""); setErrorMsg("")
    setInterrupted(false); setBars(Array(BAR_COUNT).fill(0.12)); onClose()
  }, [stopAll, onClose])

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted })
      setIsMuted(!isMuted)
    }
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  useEffect(() => { if (isOpen) startCall(); return () => stopAll() }, [isOpen, startCall, stopAll])

  if (!isOpen) return null

  const isSpeaking = status === "speaking"
  const isListening = status === "listening"

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(160deg, #fdf2f8 0%, #faf5ff 45%, #f0f9ff 100%)" }}
    >
      {/* Close */}
      <button onClick={endCall}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/70 backdrop-blur flex items-center justify-center shadow-soft hover:bg-white transition-colors">
        <X className="w-5 h-5 text-foreground/60" />
      </button>

      {/* Interrupt badge */}
      <AnimatePresence>
        {interrupted && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute top-5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-pink-100 border border-pink-200 text-xs text-pink-600 font-medium">
            Interrupting Zoya… 🎤
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar */}
      <div className="relative mb-8 flex items-center justify-center">
        {(isListening || isSpeaking) && [1, 2, 3].map(i => (
          <motion.div key={i} className="absolute rounded-full"
            style={{ width: 128 + i * 48, height: 128 + i * 48, background: `oklch(0.72 0.12 350 / ${0.12 - i * 0.03})` }}
            animate={{ scale: [1, 1.13, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.9 + i * 0.42, repeat: Infinity, delay: i * 0.26 }} />
        ))}
        <motion.div
          animate={isSpeaking ? { scale: [1, 1.07, 1] } : { scale: 1 }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-32 h-32 rounded-full gradient-pink flex items-center justify-center shadow-glow-pink relative z-10"
        >
          <span className="font-serif text-5xl font-bold text-white">Z</span>
        </motion.div>
        <span className="absolute bottom-2 right-2 z-20 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white" />
      </div>

      <h2 className="font-serif text-3xl font-semibold text-foreground mb-1">Zoya</h2>
      <p className="text-muted-foreground text-sm mb-2 h-5">
        {status === "connecting" && "Connecting…"}
        {status === "listening" && "Sun rahi hoon… bolo 🎙️"}
        {status === "processing" && "Soch rahi hoon…"}
        {status === "speaking" && "Bol rahi hoon… (baat karo interrupt ke liye)"}
        {status === "error" && "Kuch issue hua…"}
        {status === "idle" && "Call ended"}
      </p>

      <p className="font-mono text-2xl text-foreground/70 mb-6">{fmt(callDuration)}</p>

      {/* Real-time waveform */}
      <div className="flex items-center gap-[2.5px] h-14 mb-5">
        {bars.map((h, i) => (
          <motion.div key={i} className="w-[3px] rounded-full"
            style={{ background: isSpeaking ? "oklch(0.62 0.18 340)" : "oklch(0.72 0.12 350)" }}
            animate={{ scaleY: h }}
            transition={{ duration: 0.05, ease: "linear" }} />
        ))}
      </div>

      {/* Transcript bubble */}
      <AnimatePresence mode="wait">
        {transcript && (
          <motion.div key={transcript.slice(0, 20)}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="max-w-[300px] text-center px-5 py-3 rounded-2xl mb-6 glass-soft shadow-soft">
            <p className="text-sm text-foreground/80 leading-relaxed">{transcript}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {status === "error" && errorMsg && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 mb-4 text-center px-4">
          {errorMsg}
        </motion.p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-6">
        <motion.button whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }} onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-soft ${isMuted ? "bg-red-100 text-red-500" : "bg-white text-foreground/60"}`}>
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </motion.button>

        <motion.button whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }} onClick={endCall}
          className="rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-400/40"
          style={{ width: 74, height: 74 }}>
          <PhoneOff className="w-7 h-7 text-white" />
        </motion.button>
      </div>

      <p className="absolute bottom-4 text-[10px] text-muted-foreground/25 tracking-wide">
        Zoya · Made by Sk Taufique Hossain
      </p>
    </motion.div>
  )
}
