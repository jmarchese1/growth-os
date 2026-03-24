import Nav from '@/components/shared/Nav';
import HeroSection from '@/components/hero/HeroSection';
import TickerStrip from '@/components/sections/TickerStrip';
import ProblemSection from '@/components/sections/ProblemSection';
import SystemOverview from '@/components/sections/SystemOverview';
import FeaturesSection from '@/components/sections/FeaturesSection';
import ProposalCTA from '@/components/proposal/ProposalCTA';
import CalendlySection from '@/components/booking/CalendlySection';
import LeadCaptureSection from '@/components/lead-capture/LeadCaptureSection';
import Footer from '@/components/shared/Footer';
import ScrollReveal from '@/components/ui/ScrollReveal';
import SectionBleed from '@/components/ui/SectionBleed';
import CubeyChat from '@/components/ui/CubeyChat';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Nav />
      <HeroSection />
      <TickerStrip />

      <ScrollReveal>
        <ProblemSection />
      </ScrollReveal>

      <ScrollReveal>
        <SystemOverview />
      </ScrollReveal>

      {/* white → dark pricing */}
      <SectionBleed from="#ffffff" to="#0c0a1a" height={80} />

      <ScrollReveal>
        <FeaturesSection />
      </ScrollReveal>

      {/* dark pricing → white */}
      <SectionBleed from="#0c0a1a" to="#ffffff" height={80} />

      <CalendlySection />

      <ScrollReveal>
        <LeadCaptureSection />
      </ScrollReveal>

      {/* gray-50 → white */}
      <SectionBleed from="#f9fafb" to="#ffffff" height={48} />

      <ProposalCTA />

      {/* white → dark footer */}
      <SectionBleed from="#ffffff" to="#1e1b4b" height={80} />

      <Footer />
      <CubeyChat />
    </main>
  );
}
