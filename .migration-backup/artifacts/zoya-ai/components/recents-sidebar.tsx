"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Plus, MessageCircle, Trash2, X } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Conversation {
  id: string
  title: string
  last_message: string | null
  updated_at: string
}

interface RecentsSidebarProps {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  isOpen: boolean
  onClose: () => void
  userName: string | null
  isGuest: boolean
}

export function RecentsSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onClose,
  userName,
  isGuest,
}: RecentsSidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/10 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto
          w-72 flex flex-col
          bg-sidebar border-r border-sidebar-border
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full gradient-pink flex items-center justify-center shadow-glow-pink">
              <span className="font-serif text-base font-bold text-white">Z</span>
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground leading-none">Zoya</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isGuest ? "Guest" : (userName ?? "Friend")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* New chat */}
        <div className="px-4 py-3">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNew}
            className="w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-white border border-border hover:border-primary/30 hover:shadow-soft transition-all text-sm font-medium text-foreground/80 group"
          >
            <Plus className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform" />
            New Chat
          </motion.button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5 no-scrollbar">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageCircle className="w-8 h-8 text-primary/30 mb-3" />
              <p className="text-xs text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Start chatting with Zoya!</p>
            </div>
          ) : (
            <AnimatePresence>
              {conversations.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ delay: i * 0.03 }}
                  className={`group relative flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                    activeId === c.id
                      ? "bg-accent/60 border border-primary/10"
                      : "hover:bg-secondary/70"
                  }`}
                  onClick={() => { onSelect(c.id); onClose() }}
                >
                  <div className="w-8 h-8 rounded-full gradient-pink flex items-center justify-center flex-shrink-0 mt-0.5 opacity-70">
                    <MessageCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate leading-snug">
                      {c.title || "New Chat"}
                    </p>
                    {c.last_message && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {c.last_message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
                    </p>
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); onDelete(c.id) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg flex items-center justify-center hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-sidebar-border">
          <p className="text-[10px] text-muted-foreground/40 text-center">
            Zoya by Sk Taufique Hossain
          </p>
        </div>
      </motion.aside>
    </>
  )
}
