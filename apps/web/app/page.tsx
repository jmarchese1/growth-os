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

      {/* subtle glow line: light → dark */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-400/25 to-transparent" />

      <ScrollReveal>
        <AutomationExamples />
      </ScrollReveal>

      {/* dark → dark proposal */}
      <ScrollReveal>
        <ProposalCTA />
      </ScrollReveal>

      {/* subtle glow line: dark → light */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-400/25 to-transparent" />

      <ScrollReveal>
        <CalendlySection />
      </ScrollReveal>

      <Footer />
    </main>
  );
}
