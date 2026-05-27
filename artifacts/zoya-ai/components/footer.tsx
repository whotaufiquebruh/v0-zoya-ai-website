"use client"

import Link from "next/link"

export function Footer() {
  return (
    <footer className="py-12 border-t border-border/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center">
              <span className="text-white font-serif font-semibold text-sm">Z</span>
            </div>
            <span className="font-serif text-lg font-medium text-foreground">Zoya AI</span>
          </Link>
          
          {/* Links */}
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
          
          {/* Copyright */}
          <div className="text-sm text-muted-foreground text-center">
            <p>&copy; 2026 Zoya AI. All rights reserved.</p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              Founded by Sk Taufique Hossain
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
