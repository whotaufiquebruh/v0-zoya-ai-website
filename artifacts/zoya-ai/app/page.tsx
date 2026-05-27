import { AnimatedBackground } from "@/components/animated-background"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ChatPreview } from "@/components/chat-preview"
import { FeaturesSection } from "@/components/features-section"
import { AboutSection } from "@/components/about-section"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <AnimatedBackground />
      <Header />
      <HeroSection />
      <ChatPreview />
      <FeaturesSection />
      <AboutSection />
      <CTASection />
      <Footer />
    </main>
  )
}
