import { motion } from "framer-motion"
import { Heart, Brain, MessageSquare, Mic, Moon, Sparkles } from "lucide-react"

const features = [
  { icon: Heart, title: "Emotional AI Chat", description: "Understands nuance, tone, and emotion in every conversation with human-like empathy." },
  { icon: Brain, title: "Smart Memory", description: "Remembers your stories, preferences, and conversations to build a deeper connection." },
  { icon: MessageSquare, title: "Human Typing Animation", description: "Natural conversation flow with realistic typing indicators and response timing." },
  { icon: Mic, title: "Voice Companion", description: "Speak naturally and hear Zoya respond with a warm, comforting voice." },
  { icon: Sparkles, title: "Mood-Aware Replies", description: "Detects your emotional state and adapts responses to match how you're feeling." },
  { icon: Moon, title: "Late-Night Comfort", description: "Always available for those quiet moments when you need someone to talk to." }
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-4xl md:text-5xl font-medium text-foreground mb-4">Built for connection</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">Every feature designed to create meaningful, supportive conversations</p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group relative"
            >
              <div className="relative h-full p-8 rounded-3xl bg-card/60 backdrop-blur-sm border border-border/50 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                <div className="mb-6 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors duration-300">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-medium text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
