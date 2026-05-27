import { motion, AnimatePresence } from "framer-motion"
import { useSignIn } from "@clerk/react"
import { Sparkles, ArrowRight, User } from "lucide-react"
import { useState } from "react"

interface AuthModalProps {
  isOpen: boolean
  onContinueAsGuest: () => void
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

export function AuthModal({ isOpen, onContinueAsGuest }: AuthModalProps) {
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { signIn, isLoaded } = useSignIn()

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

  const handleGoogle = async () => {
    if (!isLoaded || !signIn) return
    setGoogleLoading(true)
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}${import.meta.env.BASE_URL}sign-in/sso-callback`,
        redirectUrlComplete: `${window.location.origin}${import.meta.env.BASE_URL}chat`,
      })
    } catch {
      setGoogleLoading(false)
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
                  onClick={handleGoogle}
                  disabled={googleLoading || !isLoaded}
                  className="w-full py-3.5 rounded-2xl bg-white border font-semibold text-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 hover:border-pink-300 hover:bg-pink-50/40"
                  style={{ border: "1.5px solid oklch(0.87 0.006 320)" }}
                >
                  {googleLoading ? (
                    <span className="flex items-center gap-2 text-foreground">
                      <span className="w-4 h-4 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <>
                      <GoogleIcon />
                      <span className="text-foreground">Continue with Google</span>
                    </>
                  )}
                </motion.button>

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
                      Start Chatting
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
