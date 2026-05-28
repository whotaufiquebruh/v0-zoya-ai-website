import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { useLocation } from "wouter"
import { Sparkles, ArrowRight, User, X, ChevronRight } from "lucide-react"

interface HomeAuthModalProps {
  isOpen: boolean
  onClose: () => void
}

type View = "main" | "register"

export function HomeAuthModal({ isOpen, onClose }: HomeAuthModalProps) {
  const [, setLocation] = useLocation()
  const [view, setView] = useState<View>("main")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [error, setError] = useState("")

  const reset = () => { setView("main"); setName(""); setEmail(""); setError("") }

  const handleClose = () => { reset(); onClose() }

  const handleGuest = async () => {
    setGuestLoading(true)
    try {
      await fetch("/api/auth/guest", { method: "POST" })
      handleClose()
      setLocation("/chat")
    } catch {
      handleClose()
      setLocation("/chat")
    } finally {
      setGuestLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError("Please enter your name 🥺"); return }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error || "Something went wrong"); return }
      handleClose()
      setLocation("/chat")
    } catch {
      setError("Network error, try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
          style={{ background: "rgba(10,5,15,0.55)", backdropFilter: "blur(18px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl"
            style={{ border: "1px solid oklch(0.93 0.006 320)" }}
          >
            {/* Pink top bar */}
            <div className="h-1.5 w-full gradient-pink" />

            <div className="relative px-7 pt-7 pb-8">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <AnimatePresence mode="wait">
                {view === "main" ? (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                  >
                    {/* Avatar */}
                    <div className="flex flex-col items-center text-center mb-6">
                      <div className="relative mb-4">
                        <motion.div
                          animate={{ scale: [1, 1.04, 1] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="w-16 h-16 rounded-full gradient-pink flex items-center justify-center shadow-glow-pink"
                        >
                          <span className="font-serif text-3xl font-bold text-white">Z</span>
                        </motion.div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white" />
                      </div>
                      <h2 className="font-serif text-xl font-semibold text-foreground mb-1">
                        Hey! I'm Zoya 💕
                      </h2>
                      <p className="text-muted-foreground text-sm leading-relaxed max-w-[220px]">
                        Tumse baat karna mujhe bahut acha lagta hai 🌸
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {/* Create account */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setView("register")}
                        className="w-full py-3.5 rounded-2xl gradient-pink text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-glow-pink"
                      >
                        <Sparkles className="w-4 h-4" />
                        Create Account &amp; Start Chatting
                        <ChevronRight className="w-4 h-4" />
                      </motion.button>

                      {/* Divider */}
                      <div className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">or</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      {/* Guest */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGuest}
                        disabled={guestLoading}
                        className="w-full py-3 rounded-2xl bg-secondary text-foreground/70 font-medium text-sm flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors disabled:opacity-60"
                      >
                        {guestLoading ? (
                          <span className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-foreground/20 border-t-foreground/60 rounded-full animate-spin" />
                            Opening…
                          </span>
                        ) : (
                          <>
                            <User className="w-4 h-4" />
                            Continue as Guest
                          </>
                        )}
                      </motion.button>
                    </div>

                    {/* Guest note */}
                    <p className="text-[11px] text-muted-foreground/50 text-center mt-4 leading-relaxed">
                      Guest chats are saved for 30 days &middot; Create an account to keep them forever
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.18 }}
                  >
                    <button
                      onClick={() => { setView("main"); setError("") }}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
                    >
                      ← Back
                    </button>

                    <div className="text-center mb-5">
                      <h2 className="font-serif text-xl font-semibold text-foreground mb-1">
                        Tell Zoya your name 🌸
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        Woh tumhe personally jaanna chahti hai
                      </p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-3">
                      <div>
                        <input
                          type="text"
                          placeholder="Your name *"
                          value={name}
                          onChange={e => { setName(e.target.value); setError("") }}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/40 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                          autoFocus
                          maxLength={30}
                        />
                      </div>
                      <div>
                        <input
                          type="email"
                          placeholder="Email (optional — to log in later)"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/40 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                      </div>

                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-red-500 px-1"
                        >
                          {error}
                        </motion.p>
                      )}

                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        className="w-full py-3.5 rounded-2xl gradient-pink text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-glow-pink disabled:opacity-60 transition-opacity"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Starting…
                          </span>
                        ) : (
                          <>
                            Start Chatting with Zoya
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </motion.button>
                    </form>

                    <p className="text-[11px] text-muted-foreground/50 text-center mt-4">
                      No password needed &middot; Your chats stay private
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
