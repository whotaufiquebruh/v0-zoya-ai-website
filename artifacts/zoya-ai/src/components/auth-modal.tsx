import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, ArrowRight, User } from "lucide-react"
import { useState } from "react"

interface AuthModalProps {
  isOpen: boolean
  onContinueAsGuest: () => void
}

export function AuthModal({ isOpen, onContinueAsGuest }: AuthModalProps) {
  const [loading, setLoading] = useState(false)

  const handleGuest = async () => {
    setLoading(true)
    try {
      await fetch("/api/auth/guest", { method: "POST" })
      onContinueAsGuest()
    } catch {
      onContinueAsGuest()
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
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ background: "rgba(250, 245, 248, 0.85)", backdropFilter: "blur(24px)" }}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="w-full max-w-sm bg-white rounded-3xl shadow-soft overflow-hidden"
            style={{ border: "1px solid oklch(0.93 0.006 320)" }}
          >
            <div className="h-1 gradient-pink" />

            <div className="px-8 pt-8 pb-8 flex flex-col items-center text-center">
              <div className="relative mb-6">
                <motion.div
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-full gradient-pink flex items-center justify-center shadow-glow-pink"
                >
                  <span className="font-serif text-4xl font-bold text-white">Z</span>
                </motion.div>
                <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="w-2 h-2 bg-white rounded-full" />
                </span>
              </div>

              <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
                Hey, I'm Zoya 💕
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-[260px]">
                Main tumhari companion hoon. Tumse baat karna mujhe bahut acha lagta hai 🌸
              </p>

              <div className="w-full space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGuest}
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl gradient-pink text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-glow-pink transition-opacity disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Opening...
                    </span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Start Chatting with Zoya
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGuest}
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-secondary text-secondary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Continue as Guest
                </motion.button>
              </div>

              <p className="mt-6 text-[11px] text-muted-foreground/60">
                By continuing you accept our terms of use
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/40">
                Made with 💕 by Sk Taufique Hossain
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
