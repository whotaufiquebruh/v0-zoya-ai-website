import { useState } from "react"
import { AnimatedBackground } from "@/components/animated-background"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ChatPreview } from "@/components/chat-preview"
import { FeaturesSection } from "@/components/features-section"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"
import { HomeAuthModal } from "@/components/home-auth-modal"

export default function HomePage() {
  const [authOpen, setAuthOpen] = useState(false)

  const handleStartTalking = () => setAuthOpen(true)

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <AnimatedBackground />
      <Header onChatClick={handleStartTalking} />
      <HeroSection onStartTalking={handleStartTalking} />
      <ChatPreview />
      <FeaturesSection />
      <CTASection onStartTalking={handleStartTalking} />
      <Footer />
      <HomeAuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  )
}
