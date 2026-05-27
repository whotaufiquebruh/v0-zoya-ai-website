"use client"

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

export function VoiceCallModal({ isOpen, onClose, initialStream, onTranscript }: VoiceCallModalProps) {
  const [status, setStatus] = useState<CallStatus>("idle")
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isClosingRef = useRef(false)
  const isPlayingRef = useRef(false)
  const isRecordingRef = useRef(false)
  const startRecRef = useRef<() => void>(() => {})

  const stopAll = useCallback(() => {
    isClosingRef.current = true
    isPlayingRef.current = false
    isRecordingRef.current = false
    if (mediaRecorderRef.current?.state === "recording") {
      try { mediaRecorderRef.current.stop() } catch { /* noop */ }
    }
    mediaRecorderRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || isClosingRef.current || isPlayingRef.current) return

    if (!streamRef.current || !streamRef.current.getAudioTracks().some(t => t.readyState === "live")) {
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        setStatus("error"); setErrorMsg("Microphone access lost. Please try again."); return
      }
    }

    isRecordingRef.current = true
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
        if (isClosingRef.current || chunksRef.current.length === 0) return
        const blob = new Blob(chunksRef.current, { type: mimeType })
        await processAudio(blob)
      }

      mr.onerror = () => {
        isRecordingRef.current = false
        setStatus("error"); setErrorMsg("Recording failed.")
      }

      mr.start(1000)

      setTimeout(() => {
        if (mr.state === "recording" && !isClosingRef.current) mr.stop()
      }, 8000)

    } catch {
      isRecordingRef.current = false
      setStatus("error"); setErrorMsg("Could not start recording.")
    }
  }, [])

  useEffect(() => { startRecRef.current = startRecording }, [startRecording])

  const processAudio = async (blob: Blob) => {
    if (isClosingRef.current) return
    setStatus("processing")
    setTranscript("Sunrahi hoon...")

    try {
      const sttForm = new FormData()
      sttForm.append("audio", blob, "voice.webm")
      const sttRes = await fetch("/api/voice/stt", { method: "POST", body: sttForm })
      const { transcript: userText } = await sttRes.json()

      if (!userText?.trim()) {
        setTranscript("Kuch sunai nahi... dobara bolo na")
        setStatus("listening")
        setTimeout(() => { if (!isClosingRef.current && !isPlayingRef.current) startRecRef.current() }, 1500)
        return
      }

      if (isClosingRef.current) return
      setTranscript(`"${userText}"`)
      onTranscript?.(userText, true)

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
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

      const audioBlob = await ttsRes.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      isPlayingRef.current = true
      setStatus("speaking")

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        isPlayingRef.current = false
        URL.revokeObjectURL(audioUrl)
        if (!isClosingRef.current) {
          setStatus("listening")
          setTimeout(() => { if (!isClosingRef.current && !isPlayingRef.current) startRecRef.current() }, 600)
        }
      }

      audio.onerror = () => {
        isPlayingRef.current = false
        URL.revokeObjectURL(audioUrl)
        if (!isClosingRef.current) {
          setStatus("listening")
          setTimeout(() => { if (!isClosingRef.current && !isPlayingRef.current) startRecRef.current() }, 1500)
        }
      }

      try { await audio.play() } catch {
        isPlayingRef.current = false
        setStatus("listening")
        setTimeout(() => { if (!isClosingRef.current && !isPlayingRef.current) startRecRef.current() }, 1500)
      }
    } catch {
      if (isClosingRef.current) return
      setTranscript("Connection issue… try again")
      setStatus("listening")
      setTimeout(() => { if (!isClosingRef.current && !isPlayingRef.current) startRecRef.current() }, 2000)
    }
  }

  const startCall = useCallback(async () => {
    isClosingRef.current = false
    setStatus("connecting"); setErrorMsg(""); setTranscript("")

    if (initialStream?.getAudioTracks().some(t => t.readyState === "live")) {
      streamRef.current = initialStream
    } else {
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        setStatus("error"); setErrorMsg("Microphone access required."); return
      }
    }

    timerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000)
    setTimeout(() => { if (!isClosingRef.current) startRecRef.current() }, 800)
  }, [initialStream])

  const endCall = useCallback(() => {
    stopAll(); setStatus("idle"); setCallDuration(0); setTranscript(""); setErrorMsg(""); onClose()
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
      style={{
        background: "linear-gradient(160deg, #fdf2f8 0%, #faf5ff 40%, #f0f9ff 100%)",
      }}
    >
      <audio ref={audioRef} className="hidden" />

      {/* Close */}
      <button
        onClick={endCall}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/70 backdrop-blur flex items-center justify-center shadow-soft hover:bg-white transition-colors"
      >
        <X className="w-5 h-5 text-foreground/60" />
      </button>

      {/* Zoya avatar with rings */}
      <div className="relative mb-8 flex items-center justify-center">
        {isActive && (
          <>
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 128 + i * 44,
                  height: 128 + i * 44,
                  background: `oklch(0.72 0.12 350 / ${0.12 - i * 0.03})`,
                }}
                animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
              />
            ))}
          </>
        )}
        <motion.div
          animate={isSpeaking ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="w-32 h-32 rounded-full gradient-pink flex items-center justify-center shadow-glow-pink relative z-10"
        >
          <span className="font-serif text-5xl font-bold text-white">Z</span>
        </motion.div>
        <span className="absolute bottom-2 right-2 z-20 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white" />
      </div>

      {/* Name + status */}
      <h2 className="font-serif text-3xl font-semibold text-foreground mb-1">Zoya</h2>
      <p className="text-muted-foreground text-sm mb-2">
        {status === "connecting" && "Connecting…"}
        {status === "listening" && "Sun rahi hoon…"}
        {status === "processing" && "Soch rahi hoon…"}
        {status === "speaking" && "Bol rahi hoon…"}
        {status === "error" && "Kuch issue hua…"}
        {status === "idle" && "Call ended"}
      </p>

      {/* Timer */}
      <p className="font-mono text-2xl text-foreground/70 mb-6">{fmt(callDuration)}</p>

      {/* Waveform */}
      <div className="flex items-center gap-[3px] h-14 mb-5">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="w-[3px] rounded-full"
            style={{ background: "oklch(0.72 0.12 350)" }}
            animate={isActive ? { scaleY: [0.3, Math.random() * 0.8 + 0.4, 0.3] } : { scaleY: 0.2 }}
            transition={{ duration: 0.45 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.04 }}
          />
        ))}
      </div>

      {/* Transcript */}
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

      {/* Controls */}
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
          className="w-18 h-18 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-400/40"
          style={{ width: 72, height: 72 }}
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </motion.button>
      </div>

      {/* Footer branding */}
      <p className="absolute bottom-4 text-[10px] text-muted-foreground/30">
        Zoya by Sk Taufique Hossain
      </p>
    </motion.div>
  )
}
