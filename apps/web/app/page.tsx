import Nav from '@/components/shared/Nav';
import HeroSection from '@/components/hero/HeroSection';
import TickerStrip from '@/components/sections/TickerStrip';
import ProblemSection from '@/components/sections/ProblemSection';
import SystemOverview from '@/components/sections/SystemOverview';
import FeaturesSection from '@/components/sections/FeaturesSection';
import AutomationExamples from '@/components/sections/AutomationExamples';
import ProposalCTA from '@/components/proposal/ProposalCTA';
import CalendlySection from '@/components/booking/CalendlySection';
import Footer from '@/components/shared/Footer';
import ScrollReveal from '@/components/ui/ScrollReveal';
import SectionBleed from '@/components/ui/SectionBleed';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Nav />
      <HeroSection />
      <TickerStrip />

      <ScrollReveal>
        <ProblemSection />
      </ScrollReveal>

      {/* white → white grid: subtle bleed keeps sections from hard-cutting */}
      <ScrollReveal>
        <SystemOverview />
      </ScrollReveal>

      {/* white → gray-50 */}
      <SectionBleed from="#ffffff" to="#f9fafb" height={60} />

      <ScrollReveal>
        <FeaturesSection />
      </ScrollReveal>

      {/* gray-50 → dark */}
      <SectionBleed from="#f9fafb" to="#030712" height={100} />

      <ScrollReveal>
        <AutomationExamples />
      </ScrollReveal>

      {/* dark → dark proposal */}
      <ScrollReveal>
        <ProposalCTA />
      </ScrollReveal>

      {/* dark → white about */}
      <SectionBleed from="#030712" to="#ffffff" height={100} />

      <ScrollReveal>
        <CalendlySection />
      </ScrollReveal>

      <Footer />
    </main>
  );
}
