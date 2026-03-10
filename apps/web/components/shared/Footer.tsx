export default function Footer() {
  return (
    <footer className="py-16 px-6 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <p className="text-lg font-semibold">Embedo</p>
          <p className="text-sm text-gray-400 mt-1">AI infrastructure for local businesses.</p>
        </div>

        <div className="flex gap-8">
          <a href="#system" className="text-sm text-gray-400 hover:text-black transition-colors">
            System
          </a>
          <a href="#features" className="text-sm text-gray-400 hover:text-black transition-colors">
            Features
          </a>
          <a href="#proposal" className="text-sm text-gray-400 hover:text-black transition-colors">
            Proposal
          </a>
          <a href="#book" className="text-sm text-gray-400 hover:text-black transition-colors">
            Book a Call
          </a>
        </div>

        <p className="text-xs text-gray-300">© 2025 Embedo. All rights reserved.</p>
      </div>
    </footer>
  );
}
