'use client';
import Link from 'next/link';
import EmbedoLogo from '@/components/ui/EmbedoLogo';
import { useState, useEffect } from 'react';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur-md border-b border-gray-100' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <EmbedoLogo size={28} />
          <span className="text-base font-bold tracking-tight">Embedo</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <a href="#system" className="text-sm text-gray-500 hover:text-black transition-colors px-3 py-2 rounded-lg hover:bg-gray-100">System</a>
          <a href="#features" className="text-sm text-gray-500 hover:text-black transition-colors px-3 py-2 rounded-lg hover:bg-gray-100">Features</a>
          <a href="#book" className="text-sm text-gray-500 hover:text-black transition-colors px-3 py-2 rounded-lg hover:bg-gray-100">Book a Call</a>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#proposal"
            className="text-sm px-5 py-2 bg-black text-white rounded-full hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 font-medium"
          >
            Get Proposal
          </a>
        </div>
      </div>
    </nav>
  );
}
