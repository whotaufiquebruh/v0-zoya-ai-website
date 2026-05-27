import { motion } from "framer-motion"

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-30"
        style={{
          background: "radial-gradient(circle, rgba(244, 194, 204, 0.6) 0%, transparent 70%)",
        }}
        animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(192, 192, 210, 0.5) 0%, transparent 70%)",
        }}
        animate={{ x: [0, -40, 0], y: [0, -50, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full blur-3xl opacity-15"
        style={{
          background: "radial-gradient(circle, rgba(244, 194, 204, 0.4) 0%, transparent 70%)",
        }}
        animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />
    </div>
  )
}
