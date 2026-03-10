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

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Nav />
      <HeroSection />
      <TickerStrip />
      <ProblemSection />
      <SystemOverview />
      <FeaturesSection />
      <AutomationExamples />
      <ProposalCTA />
      <CalendlySection />
      <Footer />
    </main>
  );
}
