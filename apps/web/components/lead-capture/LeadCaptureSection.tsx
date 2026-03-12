import LeadCaptureForm from './LeadCaptureForm';

export default function LeadCaptureSection() {
  return (
    <section id="get-started" className="py-16 px-6 bg-gray-50">
      <div className="max-w-xl mx-auto text-center">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-embedo-accent mb-3">
          Not ready for a call yet?
        </p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-3">
          Let us show you what&apos;s possible.
        </h2>
        <p className="text-gray-500 mb-8">
          Drop your info and we&apos;ll send you a personalized breakdown of how Embedo
          can save your restaurant time, money, and missed customers.
        </p>
        <LeadCaptureForm />
      </div>
    </section>
  );
}
