"use client"

import { motion } from "framer-motion"
import Link from "next/link"

export function Header() {
  return (
    <motion.header 
      className="fixed top-0 left-0 right-0 z-50"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="mx-auto max-w-7xl px-6 py-5">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center shadow-sm">
              <span className="text-white font-serif text-lg font-semibold">Z</span>
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <span className="font-serif text-xl font-medium tracking-tight text-foreground">Zoya</span>
          </Link>
          
          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              href="#features" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Features
            </Link>
            <Link 
              href="#demo" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Demo
            </Link>
            <Link 
              href="#about" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              About
            </Link>
          </div>
          
          {/* CTA Button */}
          <motion.button
            className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Get Early Access
          </motion.button>
        </nav>
      </div>
    </motion.header>
  )
}
