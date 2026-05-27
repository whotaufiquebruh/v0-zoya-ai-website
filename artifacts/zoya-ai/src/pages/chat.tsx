"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, Phone, Send, ShieldCheck, ShieldX, Mic, Volume2, Sparkles } from "lucide-react"
import { AuthModal } from "@/components/auth-modal"
import { RecentsSidebar } from "@/components/recents-sidebar"
import { VoiceCallModal } from "@/components/voice-call-modal"
import { Link } from "wouter"

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

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 max-w-xs">
      <div className="w-7 h-7 rounded-full gradient-pink flex items-center justify-center flex-shrink-0 shadow-glow-pink/30">
        <span className="text-white text-xs font-bold">Z</span>
      </div>
      <div className="msg-zoya px-4 py-3 rounded-2xl rounded-bl-md shadow-soft">
        <div className="flex items-center gap-1.5">
          {[0, 0.18, 0.36].map((delay, i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "oklch(0.72 0.12 350 / 0.6)" }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.7, repeat: Infinity, delay }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

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
  const isRequestingMic = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const convIdRef = useRef<string | null>(null)

  useEffect(() => { convIdRef.current = activeConvId }, [activeConvId])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, isLoading, scrollToBottom])

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
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
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

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isLoading) return

    setInput("")
    const userMsg: Message = { id: `u_${Date.now()}`, role: "user", content, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, conversationId: convIdRef.current }),
      })
      const data = await res.json()

      const aiMsg: Message = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: data.reply || "Hey… main hoon na 🤍",
        timestamp: new Date(),
      }
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

  const handleDenyMic = () => {
    setShowMicPrompt(false)
    setPermissionError("Voice calls require microphone access.")
  }

  const handleCallClose = () => { setIsCallOpen(false); setActiveStream(null) }

  const handleVoiceTranscript = useCallback((text: string, isUser: boolean) => {
    if (!isUser) {
      setMessages(prev => [
        ...prev,
        { id: `vc_${Date.now()}`, role: "assistant" as const, content: text, timestamp: new Date() },
      ])
    }
  }, [])

  const suggestedMessages = [
    "Hey Zoya! Kaise ho? 😊",
    "I'm feeling lonely today...",
    "Tell me something fun!",
    "Aaj ka din kaisa tha tumhara?",
  ]

  if (sessionLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="w-16 h-16 rounded-full gradient-pink flex items-center justify-center shadow-glow-pink">
          <span className="font-serif text-3xl font-bold text-white">Z</span>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-bg flex" style={{ height: "100dvh" }}>
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
        <div className="flex items-center justify-between px-4 py-3 glass border-b border-border/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <Menu className="w-5 h-5 text-foreground/70" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-full gradient-pink flex items-center justify-center shadow-glow-pink/40">
                  <span className="font-serif text-base font-bold text-white">Z</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground leading-none">Zoya</p>
                <p className="text-[11px] text-emerald-500 mt-0.5">Online</p>
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
              className="px-3 py-2 rounded-full text-xs text-muted-foreground hover:bg-secondary transition-colors">
              Home
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center min-h-[50vh] text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-20 h-20 rounded-full gradient-pink flex items-center justify-center shadow-glow-pink mb-5"
              >
                <span className="font-serif text-4xl font-bold text-white">Z</span>
              </motion.div>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
                Hey{session?.name && !session.isGuest ? `, ${session.name}` : ""}! 💕
              </h2>
              <p className="text-muted-foreground text-sm max-w-[260px] leading-relaxed mb-8">
                Main Zoya hoon… tumse baat karne ka wait kar rahi thi 🌸
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {suggestedMessages.map((msg) => (
                  <motion.button
                    key={msg}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => sendMessage(msg)}
                    className="px-4 py-2 rounded-full glass-soft text-sm text-foreground/70 hover:border-primary/30 hover:text-foreground transition-all shadow-soft"
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
                  msg.role === "user"
                    ? "msg-user rounded-br-md"
                    : "msg-zoya rounded-bl-md text-foreground"
                }`}>
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
              <TypingIndicator />
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

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

        <div className="px-4 py-4 glass border-t border-border/50">
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Kuch bolo Zoya se…"
                rows={1}
                className="w-full resize-none bg-white border border-border rounded-2xl px-4 py-3.5 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-soft"
                style={{ maxHeight: 120, overflowY: "auto" }}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = "auto"
                  el.style.height = Math.min(el.scrollHeight, 120) + "px"
                }}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
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
            <p className="text-[10px] text-muted-foreground/40">
              Press Enter to send, Shift+Enter for new line
            </p>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary/40" />
              <p className="text-[10px] text-muted-foreground/40">Powered by Groq</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
