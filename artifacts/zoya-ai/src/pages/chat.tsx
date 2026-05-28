"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, Phone, Send, ShieldCheck, ShieldX, Mic, Volume2 } from "lucide-react"
import { AuthModal } from "@/components/auth-modal"
import { RecentsSidebar } from "@/components/recents-sidebar"
import { VoiceCallModal } from "@/components/voice-call-modal"
import { Link } from "wouter"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp?: Date
}

interface Conversation {
  id: string
  title: string
  last_message: string | null
  updated_at: string
}

interface SessionInfo {
  userId: string
  isGuest: boolean
  name: string | null
  email: string | null
  avatarUrl: string | null
}

type ZoyaMood = "happy" | "sleepy" | "clingy" | "teasing" | "emotional" | "calm" | "caring" | "low-energy" | "excited" | "shy"

// ── Mood config ───────────────────────────────────────────────────────────────
const MOOD_EMOJI: Record<ZoyaMood, string> = {
  happy: "😊", sleepy: "😴", clingy: "🥺", teasing: "😏", emotional: "🥺",
  calm: "🌸", caring: "🤍", "low-energy": "😌", excited: "✨", shy: "☺️",
}

const MOOD_STATUS: Record<ZoyaMood, string> = {
  happy: "In a good mood",
  sleepy: "Getting sleepy…",
  clingy: "Missing you",
  teasing: "In a playful mood",
  emotional: "Feeling a lot rn",
  calm: "Calm & peaceful",
  caring: "Here for you",
  "low-energy": "Little tired today",
  excited: "Super excited!",
  shy: "Being a little shy",
}

// ── Dynamic background by mood ────────────────────────────────────────────────
function getMoodBackground(mood: ZoyaMood, isNight: boolean): string {
  if (isNight) return "linear-gradient(135deg, oklch(0.12 0.02 280) 0%, oklch(0.10 0.03 320) 100%)"
  const gradients: Record<ZoyaMood, string> = {
    happy:        "linear-gradient(135deg, oklch(0.98 0.012 340) 0%, oklch(0.96 0.018 60) 100%)",
    sleepy:       "linear-gradient(135deg, oklch(0.95 0.01 280) 0%, oklch(0.92 0.015 310) 100%)",
    clingy:       "linear-gradient(135deg, oklch(0.97 0.018 340) 0%, oklch(0.95 0.022 320) 100%)",
    teasing:      "linear-gradient(135deg, oklch(0.98 0.015 30) 0%, oklch(0.96 0.018 340) 100%)",
    emotional:    "linear-gradient(135deg, oklch(0.96 0.012 260) 0%, oklch(0.95 0.018 310) 100%)",
    calm:         "linear-gradient(135deg, oklch(0.97 0.012 160) 0%, oklch(0.96 0.010 200) 100%)",
    caring:       "linear-gradient(135deg, oklch(0.98 0.012 340) 0%, oklch(0.96 0.018 310) 100%)",
    "low-energy": "linear-gradient(135deg, oklch(0.96 0.006 280) 0%, oklch(0.95 0.008 310) 100%)",
    excited:      "linear-gradient(135deg, oklch(0.98 0.020 30) 0%, oklch(0.96 0.024 340) 100%)",
    shy:          "linear-gradient(135deg, oklch(0.97 0.016 350) 0%, oklch(0.96 0.014 320) 100%)",
  }
  return gradients[mood] ?? gradients.calm
}

// ── Typing indicator with realistic delays ────────────────────────────────────
function TypingIndicator({ mood }: { mood: ZoyaMood }) {
  const isNight = new Date().getHours() >= 21 || new Date().getHours() < 6
  return (
    <div className="flex items-end gap-2 max-w-xs">
      <div className="w-7 h-7 rounded-full gradient-pink flex items-center justify-center flex-shrink-0 shadow-glow-pink/30">
        <span className="text-white text-xs font-bold">Z</span>
      </div>
      <div className="msg-zoya px-4 py-3 rounded-2xl rounded-bl-md shadow-soft">
        <div className="flex items-center gap-1.5">
          {[0, 0.22, 0.44].map((delay, i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: isNight ? "oklch(0.72 0.12 350 / 0.8)" : "oklch(0.72 0.12 350 / 0.6)" }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: mood === "sleepy" ? 1.2 : 0.75, repeat: Infinity, delay }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Mic permission prompt ─────────────────────────────────────────────────────
function MicPermissionPrompt({ isOpen, onAllow, onDeny }: { isOpen: boolean; onAllow: () => void; onDeny: () => void }) {
  if (!isOpen) return null
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center px-6"
      style={{ background: "rgba(253, 242, 248, 0.85)", backdropFilter: "blur(20px)" }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-soft"
        style={{ border: "1px solid oklch(0.93 0.006 320)" }}
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mic className="w-6 h-6 text-primary" />
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <Volume2 className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
        <h3 className="font-serif text-xl font-semibold text-foreground text-center mb-2">Microphone Access</h3>
        <p className="text-muted-foreground text-center text-sm mb-7 leading-relaxed">
          Zoya ko tumhari awaaz sunne ke liye mic chahiye. Only used during the call 🎙️
        </p>
        <div className="space-y-3">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onAllow}
            className="w-full py-3.5 rounded-2xl gradient-pink text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-glow-pink">
            <ShieldCheck className="w-4 h-4" /> Allow Access
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onDeny}
            className="w-full py-3.5 rounded-2xl bg-secondary text-foreground/70 font-medium text-sm flex items-center justify-center gap-2">
            <ShieldX className="w-4 h-4" /> Not Now
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main ChatPage ─────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [showMicPrompt, setShowMicPrompt] = useState(false)
  const [isCallOpen, setIsCallOpen] = useState(false)
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [mood, setMood] = useState<ZoyaMood>("calm")
  const [typingPhase, setTypingPhase] = useState<"idle" | "thinking" | "typing">("idle")

  const isRequestingMic = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const convIdRef = useRef<string | null>(null)

  const isNight = new Date().getHours() >= 21 || new Date().getHours() < 6

  useEffect(() => { convIdRef.current = activeConvId }, [activeConvId])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, isLoading, scrollToBottom])

  // Fetch current mood from server
  useEffect(() => {
    fetch("/api/mood").then(r => r.json()).then(d => {
      if (d.mood) setMood(d.mood as ZoyaMood)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session")
        const data = await res.json()
        if (data.authenticated) {
          setSession(data.session)
          await loadConversations()
        } else {
          setShowAuth(true)
        }
      } catch {
        setShowAuth(true)
      } finally {
        setSessionLoading(false)
      }
    }
    checkSession()
  }, [])

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/conversations")
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch { /* noop */ }
  }

  const loadMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`)
      const data = await res.json()
      setMessages(
        (data.messages || []).map((m: { id: string; role: "user" | "assistant"; content: string; created_at: string }) => ({
          id: m.id, role: m.role, content: m.content, timestamp: new Date(m.created_at),
        }))
      )
    } catch { /* noop */ }
  }

  const handleAuthComplete = useCallback(async () => {
    setShowAuth(false)
    try {
      const res = await fetch("/api/auth/session")
      const data = await res.json()
      if (data.authenticated) {
        setSession(data.session)
        await loadConversations()
      }
    } catch { /* noop */ }
  }, [])

  const handleSelectConversation = useCallback(async (id: string) => {
    setActiveConvId(id)
    convIdRef.current = id
    await loadMessages(id)
  }, [])

  const handleNewChat = useCallback(() => {
    setActiveConvId(null)
    convIdRef.current = null
    setMessages([])
    setSidebarOpen(false)
  }, [])

  const handleDeleteConversation = async (id: string) => {
    await fetch("/api/conversations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (activeConvId === id) handleNewChat()
    await loadConversations()
  }

  // Realistic typing delay — sleepy/low-energy moods feel slower
  const getTypingDelay = (replyLength: number): number => {
    const base = mood === "sleepy" || mood === "low-energy" ? 1800 : mood === "excited" ? 600 : 1000
    const perChar = mood === "sleepy" ? 28 : 18
    return Math.min(base + replyLength * perChar, 4200)
  }

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isLoading) return

    setInput("")
    const userMsg: Message = { id: `u_${Date.now()}`, role: "user", content, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    setTypingPhase("thinking")

    // Brief "thinking" pause before "typing"
    const thinkDelay = mood === "sleepy" ? 900 : mood === "excited" ? 200 : 500
    setTimeout(() => setTypingPhase("typing"), thinkDelay)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, conversationId: convIdRef.current, mood }),
      })
      const data = await res.json()

      // Update mood if server returned one
      if (data.mood) setMood(data.mood as ZoyaMood)

      const reply = data.reply || "Main hoon na 🤍"

      // Realistic typing delay before showing reply
      const delay = getTypingDelay(reply.length)
      await new Promise(r => setTimeout(r, delay))

      const aiMsg: Message = { id: `a_${Date.now()}`, role: "assistant", content: reply, timestamp: new Date() }
      setMessages(prev => [...prev, aiMsg])

      if (data.conversationId && data.conversationId !== convIdRef.current) {
        setActiveConvId(data.conversationId)
        convIdRef.current = data.conversationId
        await loadConversations()
      } else if (convIdRef.current) {
        await loadConversations()
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { id: `e_${Date.now()}`, role: "assistant", content: "Yaar network issue hai… ek second ruk 🥺", timestamp: new Date() },
      ])
    } finally {
      setIsLoading(false)
      setTypingPhase("idle")
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleCallClick = () => {
    if (isRequestingMic.current || isCallOpen) return
    setPermissionError(null)
    setShowMicPrompt(true)
  }

  const handleAllowMic = async () => {
    if (isRequestingMic.current) return
    isRequestingMic.current = true
    setShowMicPrompt(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        if (ctx.state === "suspended") await ctx.resume()
        const buf = ctx.createBuffer(1, 1, 22050)
        const src = ctx.createBufferSource()
        src.buffer = buf; src.connect(ctx.destination); src.start(0)
      }
      setActiveStream(stream)
      setIsCallOpen(true)
    } catch (err) {
      const e = err as Error
      setPermissionError(
        e.name === "NotAllowedError" ? "Microphone permission denied. Allow it in browser settings."
        : e.name === "NotFoundError" ? "No microphone found."
        : "Could not access microphone."
      )
    } finally { isRequestingMic.current = false }
  }

  const handleDenyMic = () => { setShowMicPrompt(false); setPermissionError("Voice calls require microphone access.") }
  const handleCallClose = () => { setIsCallOpen(false); setActiveStream(null) }

  const handleVoiceTranscript = useCallback((text: string, isUser: boolean) => {
    if (!isUser) {
      setMessages(prev => [
        ...prev,
        { id: `vc_${Date.now()}`, role: "assistant" as const, content: text, timestamp: new Date() },
      ])
    }
  }, [])

  const suggestedMessages = isNight
    ? ["Neend nahi aa rahi 😭", "Kuch baat karte hai", "Aaj ka din kaisa tha?", "Lonely feel ho raha hai..."]
    : ["Hey Zoya! Kaise ho? 😊", "I'm feeling lonely today...", "Tell me something fun!", "Kuch bolo na 🌸"]

  const bg = getMoodBackground(mood, isNight)

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="w-16 h-16 rounded-full gradient-pink flex items-center justify-center shadow-glow-pink">
          <span className="font-serif text-3xl font-bold text-white">Z</span>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div
      className="min-h-screen flex"
      style={{ height: "100dvh", background: bg, transition: "background 1.5s ease" }}
      animate={{ background: bg }}
      transition={{ duration: 1.5 }}
    >
      <AuthModal isOpen={showAuth} onContinueAsGuest={handleAuthComplete} />

      <AnimatePresence>
        {showMicPrompt && (
          <MicPermissionPrompt isOpen onAllow={handleAllowMic} onDeny={handleDenyMic} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCallOpen && (
          <VoiceCallModal
            isOpen={isCallOpen}
            onClose={handleCallClose}
            initialStream={activeStream}
            onTranscript={handleVoiceTranscript}
          />
        )}
      </AnimatePresence>

      <RecentsSidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onDelete={handleDeleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={session?.name ?? null}
        isGuest={session?.isGuest ?? true}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{
            background: isNight ? "rgba(20,10,30,0.7)" : "rgba(255,255,255,0.75)",
            backdropFilter: "blur(20px)",
            borderColor: isNight ? "rgba(255,255,255,0.08)" : "oklch(0.93 0.006 320)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <Menu className="w-5 h-5" style={{ color: isNight ? "rgba(255,255,255,0.7)" : undefined }} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-full gradient-pink flex items-center justify-center shadow-glow-pink/40">
                  <span className="font-serif text-base font-bold text-white">Z</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-none" style={{ color: isNight ? "rgba(255,255,255,0.9)" : "oklch(0.145 0 0)" }}>
                  Zoya
                  <span className="ml-1.5 text-xs font-normal opacity-70">{MOOD_EMOJI[mood]}</span>
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: isLoading ? "oklch(0.60 0.18 340)" : "oklch(0.55 0.15 160)" }}>
                  {isLoading ? (typingPhase === "thinking" ? "thinking…" : "typing…") : MOOD_STATUS[mood]}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleCallClick}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full gradient-pink text-white text-xs font-semibold shadow-glow-pink/40 hover:shadow-glow-pink transition-all"
            >
              <Phone className="w-3.5 h-3.5" /> Voice Call
            </motion.button>
            <Link href="/"
              className="px-3 py-2 rounded-full text-xs transition-colors"
              style={{ color: isNight ? "rgba(255,255,255,0.5)" : "oklch(0.55 0.02 320)" }}>
              Home
            </Link>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center min-h-[50vh] text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: mood === "sleepy" ? 4 : 3, repeat: Infinity }}
                className="w-20 h-20 rounded-full gradient-pink flex items-center justify-center shadow-glow-pink mb-5"
              >
                <span className="font-serif text-4xl font-bold text-white">Z</span>
              </motion.div>
              <h2 className="font-serif text-2xl font-semibold mb-2" style={{ color: isNight ? "rgba(255,255,255,0.9)" : "oklch(0.145 0 0)" }}>
                {isNight ? "Heyy… jaag rahe ho? 🌙" : `Hey${session?.name && !session.isGuest ? `, ${session.name}` : ""}! 💕`}
              </h2>
              <p className="text-sm max-w-[260px] leading-relaxed mb-8" style={{ color: isNight ? "rgba(255,255,255,0.45)" : "oklch(0.55 0.02 320)" }}>
                {isNight
                  ? "Raat ko online ho tum… sab theek hai na? 🥺"
                  : "Main Zoya hoon… tumse baat karne ka wait kar rahi thi 🌸"}
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {suggestedMessages.map((msg) => (
                  <motion.button
                    key={msg} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => sendMessage(msg)}
                    className="px-4 py-2 rounded-full text-sm transition-all shadow-soft"
                    style={{
                      background: isNight ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)",
                      border: isNight ? "1px solid rgba(255,255,255,0.12)" : "1px solid oklch(0.90 0.006 320)",
                      color: isNight ? "rgba(255,255,255,0.7)" : "oklch(0.40 0.02 320)",
                    }}
                  >
                    {msg}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"} max-w-full`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full gradient-pink flex items-center justify-center flex-shrink-0 shadow-glow-pink/30">
                    <span className="text-white text-xs font-bold">Z</span>
                  </div>
                )}
                <div className={`max-w-[75%] sm:max-w-[65%] px-4 py-3 rounded-2xl shadow-soft text-sm leading-relaxed ${
                  msg.role === "user" ? "msg-user rounded-br-md" : "rounded-bl-md"
                }`}
                  style={msg.role === "assistant" ? {
                    background: isNight ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.82)",
                    border: isNight ? "1px solid rgba(255,255,255,0.12)" : "1px solid oklch(0.92 0.006 320)",
                    color: isNight ? "rgba(255,255,255,0.88)" : "oklch(0.20 0.01 320)",
                  } : {}}
                >
                  <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-foreground/60 text-xs font-semibold">
                      {session?.name?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <TypingIndicator mood={mood} />
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Permission error */}
        <AnimatePresence>
          {permissionError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="mx-4 mb-2 px-4 py-2 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs text-center"
            >
              {permissionError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div
          className="px-4 py-4 border-t"
          style={{
            background: isNight ? "rgba(20,10,30,0.7)" : "rgba(255,255,255,0.75)",
            backdropFilter: "blur(20px)",
            borderColor: isNight ? "rgba(255,255,255,0.08)" : "oklch(0.93 0.006 320)",
          }}
        >
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isNight ? "Kuch bolo… main hoon na 🌙" : "Kuch bolo Zoya se…"}
                rows={1}
                className="w-full resize-none rounded-2xl px-4 py-3.5 pr-4 text-sm placeholder:text-muted-foreground/60 focus:outline-none transition-all shadow-soft"
                style={{
                  maxHeight: 120,
                  overflowY: "auto",
                  background: isNight ? "rgba(255,255,255,0.08)" : "white",
                  border: isNight ? "1px solid rgba(255,255,255,0.15)" : "1px solid oklch(0.90 0.006 320)",
                  color: isNight ? "rgba(255,255,255,0.88)" : "oklch(0.145 0 0)",
                }}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = "auto"
                  el.style.height = Math.min(el.scrollHeight, 120) + "px"
                }}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="w-12 h-12 rounded-2xl gradient-pink flex items-center justify-center shadow-glow-pink/40 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex-shrink-0"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </motion.button>
          </div>
          <div className="flex items-center justify-between mt-2 max-w-3xl mx-auto px-1">
            <p className="text-[10px] opacity-40" style={{ color: isNight ? "white" : "inherit" }}>
              Press Enter to send · Shift+Enter for new line
            </p>
            <p className="text-[10px] opacity-40" style={{ color: isNight ? "white" : "inherit" }}>
              {MOOD_EMOJI[mood]} {mood} mode
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
