import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"

const chatMessages = [
  { type: "user" as const, text: "I've been feeling a bit overwhelmed lately...", time: "now" },
  { type: "zoya" as const, text: "I hear you. It's completely okay to feel that way. Would you like to talk about what's been weighing on your mind?", time: "now" },
  { type: "user" as const, text: "Just work stress and not sleeping well", time: "now" },
  { type: "zoya" as const, text: "I remember you mentioned having trouble sleeping last week too. Let's work through this together. What usually helps you unwind?", time: "now" }
]

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 0.2, 0.4].map((delay, i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-primary/60"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay }}
        />
      ))}
    </div>
  )
}

export function ChatPreview() {
  const [visibleMessages, setVisibleMessages] = useState<number>(0)
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    const showNextMessage = () => {
      if (visibleMessages < chatMessages.length) {
        if (chatMessages[visibleMessages]?.type === "zoya") {
          setIsTyping(true)
          setTimeout(() => {
            setIsTyping(false)
            setVisibleMessages(prev => prev + 1)
          }, 1500)
        } else {
          setVisibleMessages(prev => prev + 1)
        }
      }
    }
    const timer = setTimeout(showNextMessage, visibleMessages === 0 ? 1000 : 2500)
    return () => clearTimeout(timer)
  }, [visibleMessages])

  useEffect(() => {
    if (visibleMessages >= chatMessages.length) {
      const resetTimer = setTimeout(() => { setVisibleMessages(0) }, 5000)
      return () => clearTimeout(resetTimer)
    }
    return undefined
  }, [visibleMessages])

  return (
    <section id="demo" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-4xl md:text-5xl font-medium text-foreground mb-4">Conversations that feel human</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">Zoya remembers your story and responds with genuine understanding</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-lg mx-auto relative"
        >
          <div className="relative rounded-3xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl shadow-primary/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
                  <span className="text-white font-serif font-semibold">Z</span>
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card"></span>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Zoya</h3>
                <p className="text-xs text-emerald-600">Online</p>
              </div>
            </div>

            <div className="p-6 min-h-[320px] flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {chatMessages.slice(0, visibleMessages).map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.type === "user"
                        ? "bg-foreground text-background rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                    }`}>
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-secondary rounded-2xl rounded-bl-md">
                    <TypingIndicator />
                  </div>
                </motion.div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border/50">
              <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-secondary/50 border border-border/30">
                <input
                  type="text"
                  placeholder="Say something..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  readOnly
                />
                <button className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-background">
                    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        </motion.div>
      </div>
    </section>
  )
}
