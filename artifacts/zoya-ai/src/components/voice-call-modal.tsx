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

// VAD thresholds
const SPEECH_THRESHOLD = 0.012   // RMS above this = speech detected
const SILENCE_THRESHOLD = 0.008  // RMS below this = silence
const SILENCE_DURATION = 1200    // ms of silence after speech → auto-stop
const MAX_RECORD_MS = 8000       // hard cap

const BAR_COUNT = 22

export function VoiceCallModal({ isOpen, onClose, initialStream, onTranscript }: VoiceCallModalProps) {
  const [status, setStatus] = useState<CallStatus>("idle")
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(0.15))

  // core refs
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // audio playback
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null)

  // VAD
  const analyserRef = useRef<AnalyserNode | null>(null)
  const vadRafRef = useRef<number | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speechStartedRef = useRef(false)
  const micSrcRef = useRef<MediaStreamAudioSourceNode | null>(null)

  // flow control
  const isClosingRef = useRef(false)
  const isPlayingRef = useRef(false)
  const isRecordingRef = useRef(false)
  const startRecRef = useRef<() => void>(() => {})

  // ── helpers ────────────────────────────────────────────────────────────────

  const getRMS = (data: Uint8Array) => {
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    return Math.sqrt(sum / data.length)
  }

  const stopVAD = useCallback(() => {
    if (vadRafRef.current) { cancelAnimationFrame(vadRafRef.current); vadRafRef.current = null }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    speechStartedRef.current = false
    setBars(Array(BAR_COUNT).fill(0.15))
  }, [])

  const stopAll = useCallback(() => {
    isClosingRef.current = true
    isPlayingRef.current = false
    isRecordingRef.current = false
    stopVAD()
    if (mediaRecorderRef.current?.state === "recording") {
      try { mediaRecorderRef.current.stop() } catch { /* noop */ }
    }
    mediaRecorderRef.current = null
    micSrcRef.current?.disconnect()
    micSrcRef.current = null
    analyserRef.current?.disconnect()
    analyserRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    try { audioSourceRef.current?.stop() } catch { /* noop */ }
    audioSourceRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
  }, [stopVAD])

  // ── VAD loop ───────────────────────────────────────────────────────────────

  const startVAD = useCallback((mr: MediaRecorder) => {
    if (!analyserRef.current) return
    const analyser = analyserRef.current
    const data = new Uint8Array(analyser.fftSize)

    const tick = () => {
      if (isClosingRef.current || mr.state !== "recording") return
      analyser.getByteTimeDomainData(data)
      const rms = getRMS(data)

      // Update waveform bars with real levels
      const newBars = Array.from({ length: BAR_COUNT }, (_, i) => {
        const idx = Math.floor((i / BAR_COUNT) * data.length)
        const v = Math.abs((data[idx] - 128) / 128)
        return Math.max(0.08, Math.min(1, v * 3.5))
      })
      setBars(newBars)

      if (rms > SPEECH_THRESHOLD) {
        // Speech detected — cancel any pending silence timer
        speechStartedRef.current = true
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
      } else if (speechStartedRef.current && rms < SILENCE_THRESHOLD && !silenceTimerRef.current) {
        // Silence after speech — start countdown to auto-stop
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null
          if (mr.state === "recording" && !isClosingRef.current) {
            mr.stop()
          }
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

    // Wire up analyser from the shared AudioContext
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      if (!analyserRef.current) {
        const analyser = audioCtxRef.current.createAnalyser()
        analyser.fftSize = 1024
        analyser.smoothingTimeConstant = 0.6
        analyserRef.current = analyser
      }
      if (!micSrcRef.current) {
        micSrcRef.current = audioCtxRef.current.createMediaStreamSource(streamRef.current)
        micSrcRef.current.connect(analyserRef.current)
        // DO NOT connect analyser to destination — we don't want mic loopback
      }
    }

    isRecordingRef.current = true
    speechStartedRef.current = false
    chunksRef.current = []
    setStatus("listening")
    setTranscript("")

    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"

      const mr = new MediaRecorder(streamRef.current, { mimeType })
      mediaRecorderRef.current = mr

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }

      mr.onstop = async () => {
        isRecordingRef.current = false
        stopVAD()
        if (isClosingRef.current || chunksRef.current.length === 0) return
        const blob = new Blob(chunksRef.current, { type: mimeType })
        await processAudio(blob)
      }

      mr.onerror = () => { isRecordingRef.current = false; setStatus("error"); setErrorMsg("Recording failed.") }

      mr.start(200) // collect chunks every 200ms for smooth waveform

      // Start VAD after a small lead-in so recorder is stable
      setTimeout(() => { if (mr.state === "recording") startVAD(mr) }, 300)

      // Hard cap — in case user never goes silent
      setTimeout(() => { if (mr.state === "recording" && !isClosingRef.current) mr.stop() }, MAX_RECORD_MS)

    } catch {
      isRecordingRef.current = false
      setStatus("error"); setErrorMsg("Could not start recording.")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startVAD, stopVAD])

  useEffect(() => { startRecRef.current = startRecording }, [startRecording])

  // ── processAudio ───────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const processAudio = async (blob: Blob) => {
    if (isClosingRef.current) return
    setStatus("processing")
    setTranscript("Sunrahi hoon…")
    setBars(Array(BAR_COUNT).fill(0.15))

    try {
      const sttForm = new FormData()
      sttForm.append("audio", blob, "voice.webm")
      const sttRes = await fetch("/api/voice/stt", { method: "POST", body: sttForm })
      const { transcript: userText } = await sttRes.json()

      if (!userText?.trim()) {
        setTranscript("Kuch sunai nahi… dobara bolo na 🙂")
        setStatus("listening")
        setTimeout(() => { if (!isClosingRef.current && !isPlayingRef.current) startRecRef.current() }, 1200)
        return
      }

      if (isClosingRef.current) return
      setTranscript(`"${userText}"`)
      onTranscript?.(userText, true)

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, mode: "voice" }),
      })
      const { reply } = await chatRes.json()
      if (isClosingRef.current) return

      onTranscript?.(reply, false)
      setTranscript(reply)

      const ttsRes = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply }),
      })
      if (!ttsRes.ok) throw new Error("TTS failed")

      const audioArrayBuffer = await ttsRes.arrayBuffer()

      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === "suspended") await ctx.resume()

      const audioBuffer = await ctx.decodeAudioData(audioArrayBuffer)
      if (isClosingRef.current) return

      isPlayingRef.current = true
      setStatus("speaking")

      // Animate bars while Zoya speaks
      let speakRaf: number
      const speakTick = () => {
        if (!isPlayingRef.current) return
        setBars(Array.from({ length: BAR_COUNT }, () => 0.2 + Math.random() * 0.65))
        speakRaf = requestAnimationFrame(speakTick)
      }
      speakRaf = requestAnimationFrame(speakTick)

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)
      audioSourceRef.current = source

      source.onended = () => {
        cancelAnimationFrame(speakRaf)
        isPlayingRef.current = false
        audioSourceRef.current = null
        setBars(Array(BAR_COUNT).fill(0.15))
        if (!isClosingRef.current) {
          setStatus("listening")
          setTimeout(() => { if (!isClosingRef.current && !isPlayingRef.current) startRecRef.current() }, 500)
        }
      }

      source.start(0)
    } catch {
      if (isClosingRef.current) return
      setTranscript("Connection issue… ek second ruk 🥺")
      setStatus("listening")
      setTimeout(() => { if (!isClosingRef.current && !isPlayingRef.current) startRecRef.current() }, 2000)
    }
  }

  // ── startCall ──────────────────────────────────────────────────────────────

  const startCall = useCallback(async () => {
    isClosingRef.current = false
    setStatus("connecting"); setErrorMsg(""); setTranscript("")
    setBars(Array(BAR_COUNT).fill(0.15))

    // Create + unlock AudioContext during user gesture
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext()
    }
    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume().catch(() => {})
    }

    if (initialStream?.getAudioTracks().some(t => t.readyState === "live")) {
      streamRef.current = initialStream
    } else {
      try { streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true }) }
      catch { setStatus("error"); setErrorMsg("Microphone access required."); return }
    }

    timerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000)
    setTimeout(() => { if (!isClosingRef.current) startRecRef.current() }, 700)
  }, [initialStream])

  const endCall = useCallback(() => {
    stopAll(); setStatus("idle"); setCallDuration(0); setTranscript(""); setErrorMsg("")
    setBars(Array(BAR_COUNT).fill(0.15)); onClose()
  }, [stopAll, onClose])

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted })
      setIsMuted(!isMuted)
    }
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  useEffect(() => {
    if (isOpen) startCall()
    return () => stopAll()
  }, [isOpen, startCall, stopAll])

  if (!isOpen) return null

  const isSpeaking = status === "speaking"
  const isActive = status === "listening" || status === "speaking"

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(160deg, #fdf2f8 0%, #faf5ff 40%, #f0f9ff 100%)" }}
    >
      <button
        onClick={endCall}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/70 backdrop-blur flex items-center justify-center shadow-soft hover:bg-white transition-colors"
      >
        <X className="w-5 h-5 text-foreground/60" />
      </button>

      {/* Avatar with ripples */}
      <div className="relative mb-8 flex items-center justify-center">
        {isActive && [1, 2, 3].map(i => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 128 + i * 44,
              height: 128 + i * 44,
              background: `oklch(0.72 0.12 350 / ${0.13 - i * 0.03})`,
            }}
            animate={{ scale: [1, 1.14, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2 + i * 0.45, repeat: Infinity, delay: i * 0.28 }}
          />
        ))}
        <motion.div
          animate={isSpeaking ? { scale: [1, 1.07, 1] } : { scale: 1 }}
          transition={{ duration: 1.1, repeat: Infinity }}
          className="w-32 h-32 rounded-full gradient-pink flex items-center justify-center shadow-glow-pink relative z-10"
        >
          <span className="font-serif text-5xl font-bold text-white">Z</span>
        </motion.div>
        <span className="absolute bottom-2 right-2 z-20 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white" />
      </div>

      <h2 className="font-serif text-3xl font-semibold text-foreground mb-1">Zoya</h2>
      <p className="text-muted-foreground text-sm mb-2">
        {status === "connecting" && "Connecting…"}
        {status === "listening" && (speechStartedRef.current ? "Sun rahi hoon… (bolo)" : "Sun rahi hoon…")}
        {status === "processing" && "Soch rahi hoon…"}
        {status === "speaking" && "Bol rahi hoon…"}
        {status === "error" && "Kuch issue hua…"}
        {status === "idle" && "Call ended"}
      </p>

      <p className="font-mono text-2xl text-foreground/70 mb-6">{fmt(callDuration)}</p>

      {/* Real-time waveform */}
      <div className="flex items-center gap-[3px] h-14 mb-5">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            className="w-[3px] rounded-full"
            style={{ background: "oklch(0.72 0.12 350)" }}
            animate={{ scaleY: h }}
            transition={{ duration: 0.06, ease: "linear" }}
          />
        ))}
      </div>

      {/* VAD indicator — shows when silence auto-stop is counting down */}
      <AnimatePresence>
        {status === "listening" && speechStartedRef.current && silenceTimerRef.current && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-muted-foreground/60 mb-2"
          >
            Silence detected — sending…
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {transcript && (
          <motion.div
            key={transcript}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="max-w-xs text-center px-5 py-3 rounded-2xl mb-6 glass-soft shadow-soft"
          >
            <p className="text-sm text-foreground/80">{transcript}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {status === "error" && errorMsg && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 mb-4 text-center">
          {errorMsg}
        </motion.p>
      )}

      <div className="flex items-center gap-5">
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isMuted ? "bg-red-100 text-red-500" : "bg-white shadow-soft text-foreground/70"
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={endCall}
          className="rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-400/40"
          style={{ width: 72, height: 72 }}
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </motion.button>
      </div>

      <p className="absolute bottom-4 text-[10px] text-muted-foreground/30">
        Zoya by Sk Taufique Hossain
      </p>
    </motion.div>
  )
}
