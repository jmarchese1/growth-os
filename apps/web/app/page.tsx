import Nav from '@/components/shared/Nav';
import HeroSection from '@/components/hero/HeroSection';
import TickerStrip from '@/components/sections/TickerStrip';
import ProblemSection from '@/components/sections/ProblemSection';
import SystemOverview from '@/components/sections/SystemOverview';
import FeaturesSection from '@/components/sections/FeaturesSection';
import ClosingCTA from '@/components/sections/ClosingCTA';
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

      <ScrollReveal>
        <SystemOverview />
      </ScrollReveal>

      {/* white → gray-50 */}
      <SectionBleed from="#ffffff" to="#f9fafb" height={48} />

      <ScrollReveal>
        <FeaturesSection />
      </ScrollReveal>

      {/* gray-50 → white */}
      <SectionBleed from="#f9fafb" to="#ffffff" height={48} />

      <ClosingCTA />

      {/* white → dark footer */}
      <SectionBleed from="#ffffff" to="#1e1b4b" height={80} />

      <Footer />
    </main>
  );
}
