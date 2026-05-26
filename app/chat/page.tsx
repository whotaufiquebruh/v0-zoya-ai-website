"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Phone, PhoneOff, Mic, MicOff, Volume2, X, ShieldCheck, ShieldX } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

// Permission Prompt Modal Component
function MicPermissionPrompt({
  isOpen,
  onAllow,
  onDeny,
}: {
  isOpen: boolean
  onAllow: () => void
  onDeny: () => void
}) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-foreground/40 backdrop-blur-sm flex items-center justify-center px-6"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="bg-background rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-border/50"
      >
        {/* Icons */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Mic className="w-7 h-7 text-primary" />
          </div>
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Volume2 className="w-7 h-7 text-emerald-500" />
          </div>
        </div>

        {/* Title */}
        <h3 className="font-serif text-xl font-medium text-foreground text-center mb-3">
          Allow Microphone & Speaker
        </h3>

        {/* Description */}
        <p className="text-muted-foreground text-center text-sm mb-8 leading-relaxed">
          Zoya needs access to your microphone to hear you and speaker to talk back. Your voice is only used during the call.
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAllow}
            className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors"
          >
            <ShieldCheck className="w-5 h-5" />
            Allow Both
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onDeny}
            className="w-full py-4 rounded-2xl bg-secondary text-foreground font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
          >
            <ShieldX className="w-5 h-5" />
            Deny
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <motion.span
        className="w-2 h-2 rounded-full bg-primary/60"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
      />
      <motion.span
        className="w-2 h-2 rounded-full bg-primary/60"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
      />
      <motion.span
        className="w-2 h-2 rounded-full bg-primary/60"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
      />
    </div>
  )
}

function VoiceCallModal({ 
  isOpen, 
  onClose,
  initialStream,
}: { 
  isOpen: boolean
  onClose: () => void
  initialStream: MediaStream | null
}) {
  const [callStatus, setCallStatus] = useState<"connecting" | "listening" | "speaking" | "error" | "idle">("idle")
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isRecordingRef = useRef(false)
  const isClosingRef = useRef(false)
  const isPlayingRef = useRef(false)
  const startRecordingRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const stopAllMedia = useCallback(() => {
    isClosingRef.current = true
    isPlayingRef.current = false
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // Ignore errors when stopping
      }
    }
    mediaRecorderRef.current = null
    isRecordingRef.current = false
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || isClosingRef.current || isPlayingRef.current) {
      console.log("[v0] Skipping startRecording - already recording, closing, or playing")
      return
    }
    
    // Check if we have a valid stream with active tracks
    if (!streamRef.current || streamRef.current.getAudioTracks().length === 0 || 
        !streamRef.current.getAudioTracks().some(track => track.readyState === 'live')) {
      console.log("[v0] Stream not valid, getting fresh stream")
      try {
        // Get a fresh stream
        const freshStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = freshStream
      } catch (err) {
        console.log("[v0] Failed to get fresh stream:", err)
        setCallStatus("error")
        setErrorMessage("Microphone access lost. Please try again.")
        return
      }
    }
    
    isRecordingRef.current = true
    audioChunksRef.current = []
    setCallStatus("listening")
    
    try {
      // Find supported mime type
      let mimeType = ''
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg'
      }
      
      console.log("[v0] Using mimeType:", mimeType || "default")
      
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {}
      const mediaRecorder = new MediaRecorder(streamRef.current, options)
      
      mediaRecorder.ondataavailable = (event) => {
        console.log("[v0] Data available:", event.data.size)
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        console.log("[v0] Recording stopped, chunks:", audioChunksRef.current.length)
        isRecordingRef.current = false
        if (isClosingRef.current || audioChunksRef.current.length === 0) return
        
        const finalMimeType = mimeType || 'audio/webm'
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType })
        console.log("[v0] Created blob:", audioBlob.size, "bytes")
        await sendVoiceToAPI(audioBlob, finalMimeType)
      }
      
      mediaRecorder.onerror = (event) => {
        console.log("[v0] MediaRecorder error:", event)
        isRecordingRef.current = false
        setCallStatus("error")
        setErrorMessage("Recording failed. Please try again.")
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000) // Collect data every second
      console.log("[v0] MediaRecorder started")
      
      // Auto-stop after 8 seconds of recording
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording" && !isClosingRef.current) {
          console.log("[v0] Auto-stopping recording")
          mediaRecorderRef.current.stop()
        }
      }, 8000)
    } catch (err) {
      console.log("[v0] Error starting MediaRecorder:", err)
      isRecordingRef.current = false
      setCallStatus("error")
      setErrorMessage("Could not start recording. Please try again.")
    }
  }, [])

  // Keep the ref updated with the latest startRecording function
  useEffect(() => {
    startRecordingRef.current = startRecording
  }, [startRecording])

  const sendVoiceToAPI = async (audioBlob: Blob, mimeType: string) => {
    if (isClosingRef.current) return
    
    setCallStatus("speaking")
    setTranscript("")
    
    try {
      const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
      const formData = new FormData()
      formData.append('audio', audioBlob, `voice.${extension}`)
      
      console.log("[v0] Sending to webhook...")
      const response = await fetch('https://zoyai.app.n8n.cloud/webhook/zoya-voice', {
        method: 'POST',
        body: formData,
      })
      
      console.log("[v0] Webhook response status:", response.status)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      console.log("[v0] Webhook response data:", data)
      
      if (isClosingRef.current) return
      
      // Handle error responses from webhook
      if (data.error) {
        console.log("[v0] Webhook returned error:", data.error)
        setTranscript("Sorry, couldn't understand that. Try again?")
        setCallStatus("listening")
        setTimeout(() => {
          if (!isClosingRef.current && !isPlayingRef.current) {
            startRecordingRef.current()
          }
        }, 2000)
        return
      }
      
      if (data.reply) {
        setTranscript(data.reply)
      }
      
      // Play audio response if available (support both "audio" and "audioUrl" keys)
      const audioUrl = data.audio || data.audioUrl
      if (audioUrl) {
        console.log("[v0] Playing audio from:", audioUrl)
        isPlayingRef.current = true
        
        // Create a new audio element for better mobile compatibility
        const audio = new Audio()
        audio.crossOrigin = "anonymous"
        audioRef.current = audio
        
        // Set up event handlers before setting src
        audio.onloadeddata = () => {
          console.log("[v0] Audio loaded, duration:", audio.duration)
        }
        
        audio.onplay = () => {
          console.log("[v0] Audio playback started")
          isPlayingRef.current = true
          setCallStatus("speaking")
        }
        
        audio.onended = () => {
          console.log("[v0] Audio playback ended")
          isPlayingRef.current = false
          if (!isClosingRef.current) {
            setCallStatus("listening")
            setTimeout(() => {
              if (!isClosingRef.current && !isPlayingRef.current) {
                startRecordingRef.current()
              }
            }, 500)
          }
        }
        
        audio.onerror = (e) => {
          console.log("[v0] Audio playback error:", e)
          isPlayingRef.current = false
          if (!isClosingRef.current) {
            setCallStatus("error")
            setErrorMessage("Could not play Zoya's reply audio. Tap Try Again.")
          }
        }
        
        // Set source and try to play
        audio.src = audioUrl
        audio.load()
        
        try {
          await audio.play()
          console.log("[v0] Audio play() succeeded")
        } catch (playError) {
          console.log("[v0] Audio play() failed:", playError)
          isPlayingRef.current = false
          // On mobile, autoplay might be blocked - show a message but continue
          setTranscript(data.reply || "Zoya replied but audio couldn't play automatically")
          setCallStatus("listening")
          setTimeout(() => {
            if (!isClosingRef.current && !isPlayingRef.current) {
              startRecordingRef.current()
            }
          }, 2000)
        }
      } else {
        // No audio URL, wait and continue listening
        console.log("[v0] No audio in response, continuing...")
        if (!isClosingRef.current) {
          setCallStatus("listening")
          setTimeout(() => {
            if (!isClosingRef.current && !isPlayingRef.current) {
              startRecordingRef.current()
            }
          }, 2000)
        }
      }
    } catch (err) {
      console.log("[v0] Webhook error:", err)
      if (isClosingRef.current) return
      setCallStatus("error")
      setErrorMessage("Connection issue... tap Try Again")
      setTranscript("")
    }
  }

  const startCall = useCallback(async () => {
    console.log("[v0] Starting call, initialStream:", !!initialStream)
    isClosingRef.current = false
    setCallStatus("connecting")
    setErrorMessage("")
    
    // Use initialStream or get a new one
    if (initialStream && initialStream.getAudioTracks().some(track => track.readyState === 'live')) {
      streamRef.current = initialStream
      console.log("[v0] Using initial stream")
    } else {
      try {
        console.log("[v0] Getting fresh stream for call")
        const freshStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = freshStream
      } catch (err) {
        console.log("[v0] Failed to get stream:", err)
        setCallStatus("error")
        setErrorMessage("Could not access microphone. Please check permissions.")
        return
      }
    }
    
    // Start timer
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)

    // Short delay then start listening
    setTimeout(() => {
      if (!isClosingRef.current) {
        startRecording()
      }
    }, 500)
  }, [initialStream, startRecording])

  const endCall = useCallback(() => {
    stopAllMedia()
    setCallStatus("idle")
    setCallDuration(0)
    setTranscript("")
    setErrorMessage("")
    onClose()
  }, [stopAllMedia, onClose])

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted
      })
      setIsMuted(!isMuted)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (isOpen) {
      startCall()
    }
    return () => {
      stopAllMedia()
    }
  }, [isOpen, startCall, stopAllMedia])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-gradient-to-b from-background via-background to-primary/10"
    >
      <audio ref={audioRef} className="hidden" />
      
      {/* Close button */}
      <button 
        onClick={endCall}
        className="absolute top-6 right-6 p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
      >
        <X className="w-6 h-6 text-foreground" />
      </button>

      <div className="h-full flex flex-col items-center justify-center px-6">
        {/* Profile Picture with Glow */}
        <motion.div 
          className="relative mb-8"
          animate={callStatus === "speaking" ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {/* Outer glow rings */}
          {callStatus !== "idle" && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/20"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ width: 160, height: 160, margin: -20 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/10"
                animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                style={{ width: 160, height: 160, margin: -20 }}
              />
            </>
          )}
          
          {/* Profile circle */}
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shadow-2xl shadow-primary/30">
            <span className="text-white font-serif font-semibold text-5xl">Z</span>
          </div>
          
          {/* Online indicator */}
          <span className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 rounded-full border-4 border-background"></span>
        </motion.div>

        {/* Name and Status */}
        <h2 className="font-serif text-3xl font-medium text-foreground mb-2">Zoya</h2>
        <p className="text-muted-foreground mb-2">
          {callStatus === "connecting" && "Connecting..."}
          {callStatus === "listening" && "Listening to you..."}
          {callStatus === "speaking" && "Speaking..."}
          {callStatus === "error" && "Something went wrong"}
          {callStatus === "idle" && "Call ended"}
        </p>
        
        {/* Error Message */}
        {callStatus === "error" && errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md text-center mb-4 px-6 py-3 rounded-2xl bg-red-50 border border-red-200"
          >
            <p className="text-red-800 text-sm">{errorMessage}</p>
            <button 
              onClick={startRecording}
              className="mt-2 text-sm text-red-600 underline hover:text-red-800"
            >
              Try Again
            </button>
          </motion.div>
        )}
        
        {/* Call Timer */}
        <p className="text-2xl font-mono text-foreground/80 mb-8">{formatTime(callDuration)}</p>

        {/* Waveform Animation */}
        <div className="flex items-center justify-center gap-1 h-16 mb-8">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-primary/60 rounded-full"
              animate={callStatus === "listening" || callStatus === "speaking" ? {
                height: [16, Math.random() * 48 + 16, 16],
              } : { height: 16 }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.05,
              }}
            />
          ))}
        </div>

        {/* Transcript */}
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md text-center mb-8 px-6 py-4 rounded-2xl bg-card/50 backdrop-blur border border-border/50"
          >
            <p className="text-foreground">{transcript}</p>
          </motion.div>
        )}

        {/* Call Controls */}
        <div className="flex items-center gap-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMute}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              isMuted 
                ? "bg-destructive/20 text-destructive" 
                : "bg-secondary text-foreground"
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={endCall}
            className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30"
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export default function ChatPage() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCallOpen, setIsCallOpen] = useState(false)
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null)
  const isRequestingPermission = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // Handle call button click - show in-app permission prompt first
  const handleCallClick = () => {
    if (isRequestingPermission.current || isCallOpen) return
    setPermissionError(null)
    setShowPermissionPrompt(true)
  }

  // User clicked "Allow" in the in-app prompt
  const handleAllowPermission = async () => {
    if (isRequestingPermission.current) return
    isRequestingPermission.current = true
    setShowPermissionPrompt(false)
    
    try {
      // This triggers the browser's native permission request
      // Must be called from a user gesture (the Allow button click)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Initialize AudioContext to enable speaker output (required for mobile)
      // This must be done from a user gesture to work on iOS/Android
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass()
        // Resume if suspended (required on iOS)
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume()
        }
        // Play a silent sound to fully unlock audio on mobile
        const silentBuffer = audioCtx.createBuffer(1, 1, 22050)
        const source = audioCtx.createBufferSource()
        source.buffer = silentBuffer
        source.connect(audioCtx.destination)
        source.start(0)
      }
      
      // Permission granted - keep the stream and pass it to the call modal
      setActiveStream(stream)
      setIsCallOpen(true)
    } catch (err) {
      const error = err as Error
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionError("Microphone permission was denied. Please allow access in your browser settings and try again.")
      } else if (error.name === 'NotFoundError') {
        setPermissionError("No microphone found. Please connect a microphone and try again.")
      } else {
        setPermissionError("Could not access microphone. Please check your device settings.")
      }
    } finally {
      isRequestingPermission.current = false
    }
  }

  // User clicked "Deny" in the in-app prompt
  const handleDenyPermission = () => {
    setShowPermissionPrompt(false)
    setPermissionError("Voice calls require microphone access. You can try again anytime.")
  }

  // Handle call close
  const handleCallClose = () => {
    setIsCallOpen(false)
    setActiveStream(null)
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "Hey... ek second ruk 🤍",
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Yaar network issue hai... phir se try kar 🥺",
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Permission Prompt Modal */}
      <AnimatePresence>
        {showPermissionPrompt && (
          <MicPermissionPrompt
            isOpen={showPermissionPrompt}
            onAllow={handleAllowPermission}
            onDeny={handleDenyPermission}
          />
        )}
      </AnimatePresence>

      {/* Permission Error Toast */}
      <AnimatePresence>
        {permissionError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-4 right-4 z-[100] max-w-md mx-auto"
          >
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 shadow-lg flex items-start gap-3">
              <ShieldX className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{permissionError}</p>
              </div>
              <button 
                onClick={() => setPermissionError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Call Modal */}
      <AnimatePresence>
        {isCallOpen && activeStream && (
          <VoiceCallModal 
            isOpen={isCallOpen} 
            onClose={handleCallClose}
            initialStream={activeStream}
          />
        )}
      </AnimatePresence>

      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
                <span className="text-white font-serif font-semibold text-lg">Z</span>
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background"></span>
            </div>
            <div>
              <h1 className="font-serif font-medium text-foreground">Zoya</h1>
              <p className="text-xs text-emerald-600">Online</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Call Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCallClick}
              className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors"
            >
              <Phone className="w-5 h-5 text-white" />
            </motion.button>
            
            <Link 
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back
            </Link>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <main className="pt-20 pb-24 px-4 max-w-3xl mx-auto">
        <div className="min-h-[calc(100vh-11rem)] flex flex-col">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center px-6"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center mb-6">
                <span className="text-white font-serif font-semibold text-3xl">Z</span>
              </div>
              <h2 className="font-serif text-2xl md:text-3xl font-medium text-foreground mb-3">
                Hey, I&apos;m Zoya
              </h2>
              <p className="text-muted-foreground max-w-md leading-relaxed">
                Main yahaan hoon tere liye. Kuch bhi share kar sakta hai mere saath. No judgment, bas genuine conversation.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-8">
                {[
                  "Kaise ho aaj?",
                  "Kuch baat karni hai",
                  "Feeling low today",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="px-4 py-2 rounded-full bg-secondary/50 border border-border/50 text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Messages */}
          <div className="flex flex-col gap-4 py-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                      <span className="text-white font-serif font-semibold text-sm">Z</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-foreground text-background rounded-br-md"
                        : "bg-card border border-border/50 text-foreground rounded-bl-md shadow-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-white font-serif font-semibold text-sm">Z</span>
                </div>
                <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md shadow-sm">
                  <TypingIndicator />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/30">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border/50 shadow-lg shadow-primary/5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type something..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-80"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-background">
                <path
                  d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
