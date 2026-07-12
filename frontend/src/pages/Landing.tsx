import LandingNavbar from '../components/landing/LandingNavbar'
import Hero from '../components/landing/Hero'
import TrustBar from '../components/landing/TrustBar'
import HowItWorks from '../components/landing/HowItWorks'
import Features from '../components/landing/Features'
import AIAgents from '../components/landing/AIAgents'
import ProductShowcase from '../components/landing/ProductShowcase'
import WhyMissionOS from '../components/landing/WhyMissionOS'
import RAGSection from '../components/landing/RAGSection'
import CTASection from '../components/landing/CTASection'
import LandingFooter from '../components/landing/LandingFooter'

function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <Features />
        <AIAgents />
        <ProductShowcase />
        <WhyMissionOS />
        <RAGSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  )
}

export default Landing
