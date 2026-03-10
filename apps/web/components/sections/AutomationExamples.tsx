const automations = [
  {
    trigger: 'Customer calls your number',
    result: 'AI answers, takes reservation, captures their info, sends confirmation SMS',
  },
  {
    trigger: 'Visitor lands on your website',
    result: 'Chatbot greets them, answers questions, offers to book — captures contact details',
  },
  {
    trigger: 'Someone comments on your Instagram post',
    result: 'AI auto-DMs them, starts a conversation, books a reservation',
  },
  {
    trigger: 'Customer completes a visit',
    result: 'Survey SMS sent automatically. Based on their response, a promotion is triggered',
  },
  {
    trigger: 'New lead captured from any source',
    result: 'Immediate SMS follow-up, then email sequence over 7 days',
  },
  {
    trigger: 'Business is onboarded',
    result: 'AI voice agent, website, chatbot, and social automation deployed in days',
  },
];

const rowBg = ['bg-transparent', 'bg-gray-50/60'];

export default function AutomationExamples() {
  return (
    <section className="bg-white text-gray-900">
      {/* Header */}
      <div className="bg-grid pt-20 pb-10 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-600 mb-4">
            Automation in Action
          </p>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-4">
            When this happens,{' '}
            <span className="text-indigo-500">that</span> happens.
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl leading-relaxed">
            Every customer interaction triggers intelligent automation. Zero manual effort required.
          </p>
        </div>
      </div>

      {/* Alternating rows */}
      <div className="px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          {automations.map((a, i) => (
            <div
              key={i}
              className={`py-6 grid grid-cols-1 md:grid-cols-2 gap-8 -mx-6 px-6 border-b border-gray-100 last:border-0 group transition-all duration-200 ${rowBg[i % 2]}`}
            >
              <div>
                <p className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                  Trigger
                </p>
                <p className="text-lg font-semibold text-gray-900">{a.trigger}</p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wider uppercase text-indigo-500 mb-2">
                  What happens
                </p>
                <p className="text-gray-500 leading-relaxed group-hover:text-gray-700 transition-colors">
                  {a.result}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
