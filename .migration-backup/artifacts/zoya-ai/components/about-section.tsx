"use client"

import { motion } from "framer-motion"

const stats = [
  { value: "24/7", label: "Always Available" },
  { value: "100%", label: "Private & Secure" },
  { value: "∞", label: "Memory Capacity" },
  { value: "<1s", label: "Response Time" }
]

export function AboutSection() {
  return (
    <section id="about" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-4xl md:text-5xl font-medium text-foreground mb-6 text-balance">
              The future of emotional AI is here
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Zoya represents a new generation of AI companions — one that truly listens, 
              remembers, and responds with genuine understanding. We&apos;re building technology 
              that enhances human connection, not replaces it.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10">
              Every conversation with Zoya is a step toward better understanding yourself. 
              Whether you need someone to talk to at 2 AM or want to process your thoughts 
              during a difficult day, Zoya is there.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="font-serif text-3xl font-medium text-foreground mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {/* Right - Floating Cards */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative aspect-square max-w-md mx-auto">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl opacity-50" />
              
              {/* Floating Cards */}
              <motion.div
                className="absolute top-10 left-10 p-6 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-xl max-w-[200px]"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <p className="text-sm text-foreground font-medium">{"\"She really gets me\""}</p>
                <p className="text-xs text-muted-foreground mt-1">- Sarah, 28</p>
              </motion.div>
              
              <motion.div
                className="absolute top-1/2 right-5 p-6 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-xl max-w-[220px]"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                  <span className="text-primary text-sm">✨</span>
                </div>
                <p className="text-sm text-foreground font-medium">{"\"Like talking to a close friend\""}</p>
                <p className="text-xs text-muted-foreground mt-1">- Marcus, 34</p>
              </motion.div>
              
              <motion.div
                className="absolute bottom-10 left-1/4 p-6 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-xl max-w-[200px]"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                </div>
                <p className="text-sm text-foreground font-medium">{"\"My 2 AM companion\""}</p>
                <p className="text-xs text-muted-foreground mt-1">- Elena, 31</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
