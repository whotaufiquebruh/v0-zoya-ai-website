"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-[2.5rem] overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground" />
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 30% 50%, rgba(244, 194, 204, 0.4) 0%, transparent 50%),
                               radial-gradient(circle at 70% 80%, rgba(192, 192, 210, 0.3) 0%, transparent 40%)`
            }}
          />
          
          {/* Content */}
          <div className="relative px-8 py-16 md:px-16 md:py-24 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="font-serif text-4xl md:text-6xl font-medium text-background mb-6 text-balance">
                Ready to meet Zoya?
              </h2>
              <p className="text-lg md:text-xl text-background/70 max-w-xl mx-auto mb-10">
                Join thousands who have already discovered a new way to connect, reflect, and grow.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.button
                  className="group flex items-center gap-2 px-8 py-4 rounded-full bg-background text-foreground font-medium text-base hover:bg-background/90 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Get Early Access
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </motion.button>
                
                <motion.button
                  className="flex items-center gap-2 px-8 py-4 rounded-full border border-background/20 text-background font-medium text-base hover:bg-background/10 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Learn More
                </motion.button>
              </div>
              
              {/* Trust indicators */}
              <div className="mt-12 flex items-center justify-center gap-8 text-background/50 text-sm">
                <span>No credit card required</span>
                <span className="hidden sm:inline">•</span>
                <span>Free to start</span>
                <span className="hidden sm:inline">•</span>
                <span>Cancel anytime</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
