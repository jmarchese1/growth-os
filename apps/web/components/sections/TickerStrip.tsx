const items = [
  'AI Voice Receptionist',
  'Lead Capture',
  'Social Media Automation',
  'Instant Follow-Ups',
  'AI Website Generation',
  'Survey & Feedback Engine',
  'Appointment Scheduling',
  'Website Chatbot',
  '24/7 Coverage',
  'Proposal Generation',
];

const DOT = (
  <span
    aria-hidden
    className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-300/60 mx-6 flex-shrink-0 align-middle"
  />
);

function Strip() {
  return (
    <div className="flex items-center whitespace-nowrap animate-ticker will-change-transform">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center">
          <span className="text-sm font-semibold tracking-[0.12em] uppercase text-gray-400">
            {item}
          </span>
          {DOT}
        </span>
      ))}
    </div>
  );
}

export default function TickerStrip() {
  return (
    <div className="relative overflow-hidden border-y border-gray-100 bg-white py-4">
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none bg-gradient-to-r from-white to-transparent" />
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none bg-gradient-to-l from-white to-transparent" />

      <div className="flex">
        {/* Two identical strips back-to-back for seamless loop */}
        <Strip />
        <Strip />
      </div>
    </div>
  );
}
