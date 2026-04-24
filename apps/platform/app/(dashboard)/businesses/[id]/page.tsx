import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EditBusinessButton } from './edit-business-button';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? process.env['API_BASE_URL'] ?? 'https://embedoapi-production.up.railway.app';

interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
  leadScore: number;
  source: string;
  createdAt: string;
}

interface Business {
  id: string;
  name: string;
  type: string;
  status: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: Address;
  timezone?: string;
  twilioPhoneNumber?: string;
  elevenLabsAgentId?: string;
  calendlyUri?: string;
  instagramPageId?: string;
  facebookPageId?: string;
  settings?: Record<string, unknown>;
  createdAt: string;
}

interface ContactsResponse {
  items: Contact[];
  total: number;
}

async function getBusiness(id: string): Promise<Business | null> {
  try {
    const res = await fetch(`${API_URL}/businesses/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getContacts(businessId: string): Promise<ContactsResponse> {
  try {
    const res = await fetch(`${API_URL}/businesses/${businessId}/contacts?pageSize=20`, { cache: 'no-store' });
    if (!res.ok) return { items: [], total: 0 };
    return res.json();
  } catch {
    return { items: [], total: 0 };
  }
}

const statusColors: Record<string, string> = {
  ACTIVE:       'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  PROVISIONING: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  PENDING:      'bg-slate-500/10 text-paper-3 border-slate-500/20',
  SUSPENDED:    'bg-red-500/15 text-red-400 border-red-500/25',
  CANCELLED:    'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
};

const contactStatusColors: Record<string, string> = {
  LEAD:     'bg-blue-500/10 text-blue-400',
  PROSPECT: 'bg-signal-soft text-signal',
  CUSTOMER: 'bg-emerald-500/10 text-emerald-400',
  CHURNED:  'bg-red-500/10 text-red-400',
};

const sourceColors: Record<string, string> = {
  VOICE:    'bg-amber-500/10 text-amber-400',
  CHATBOT:  'bg-blue-500/10 text-blue-400',
  SURVEY:   'bg-signal-soft text-signal',
  SOCIAL:   'bg-pink-500/10 text-pink-400',
  WEBSITE:  'bg-emerald-500/10 text-emerald-400',
  MANUAL:   'bg-slate-500/10 text-paper-3',
  CALENDLY: 'bg-indigo-500/10 text-indigo-400',
  OUTBOUND: 'bg-orange-500/10 text-orange-400',
};

interface ModuleInfo {
  key: string;
  name: string;
  icon: string;
}

const modules: ModuleInfo[] = [
  { key: 'voiceAgent', name: 'Voice Agent', icon: '☎️' },
  { key: 'chatbotAgent', name: 'Chatbot', icon: '💬' },
  { key: 'websiteGen', name: 'Website', icon: '🌐' },
  { key: 'socialMedia', name: 'Social Media', icon: '📱' },
  { key: 'leadEngine', name: 'Lead Engine', icon: '🎯' },
  { key: 'surveyEngine', name: 'Surveys', icon: '📊' },
  { key: 'proposalEngine', name: 'Proposals', icon: '📄' },
];

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getBusiness(id);

  if (!business) {
    notFound();
  }

  const { items: contacts, total: contactsTotal } = await getContacts(id);

  const statusBadge = statusColors[business.status] ?? 'bg-slate-500/10 text-paper-3 border-slate-500/20';

  const settings = (business.settings ?? {}) as Record<string, unknown>;
  const activeModules = modules.filter((m) => settings[m.key]);

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/businesses" className="text-paper-3 hover:text-paper transition-colors text-sm">
            ← Businesses
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-paper tracking-tight">{business.name}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${statusBadge}`}>
              {business.status}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-slate-500/10 text-paper-3 border-slate-500/20 capitalize">
              {business.type?.toLowerCase()}
            </span>
          </div>
          <p className="text-paper-3 text-sm">
            Created {new Date(business.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <EditBusinessButton business={business} />
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="bg-ink-2 backdrop-blur-sm rounded-2xl border border-rule p-6">
          <h2 className="text-xs font-semibold text-paper-3 uppercase tracking-widest mb-4">Contact Info</h2>
          <div className="space-y-3">
            {business.phone && (
              <div>
                <p className="text-xs text-paper-4 mb-1">Phone</p>
                <a href={`tel:${business.phone}`} className="text-paper hover:text-signal transition-colors font-mono text-sm">
                  {business.phone}
                </a>
              </div>
            )}
            {business.email && (
              <div>
                <p className="text-xs text-paper-4 mb-1">Email</p>
                <a href={`mailto:${business.email}`} className="text-paper hover:text-signal transition-colors text-sm break-all">
                  {business.email}
                </a>
              </div>
            )}
            {business.website && (
              <div>
                <p className="text-xs text-paper-4 mb-1">Website</p>
                <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-paper hover:text-signal transition-colors text-sm break-all">
                  {business.website}
                </a>
              </div>
            )}
            {!business.phone && !business.email && !business.website && (
              <p className="text-paper-4 text-sm">No contact info on file</p>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="bg-ink-2 backdrop-blur-sm rounded-2xl border border-rule p-6">
          <h2 className="text-xs font-semibold text-paper-3 uppercase tracking-widest mb-4">Location</h2>
          <div className="space-y-2 text-sm">
            {business.address?.street && <p className="text-paper">{business.address.street}</p>}
            {business.address?.city && (
              <p className="text-paper">
                {business.address.city}
                {business.address.state ? `, ${business.address.state}` : ''}
              </p>
            )}
            {business.address?.zip && <p className="text-paper font-mono">{business.address.zip}</p>}
            {business.timezone && (
              <p className="text-paper-3 text-xs mt-3">
                Timezone: <span className="text-paper">{business.timezone}</span>
              </p>
            )}
            {!business.address && !business.timezone && (
              <p className="text-paper-4 text-sm">No location on file</p>
            )}
          </div>
        </div>

        {/* Integrations */}
        <div className="bg-ink-2 backdrop-blur-sm rounded-2xl border border-rule p-6">
          <h2 className="text-xs font-semibold text-paper-3 uppercase tracking-widest mb-4">Integrations</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-paper-4 mb-1">Twilio Number</p>
              <p className="text-paper font-mono">{business.twilioPhoneNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-paper-4 mb-1">ElevenLabs Agent</p>
              <p className="text-paper font-mono text-xs break-all">{business.elevenLabsAgentId ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-paper-4 mb-1">Cal.com URI</p>
              <p className="text-paper font-mono text-xs break-all">{business.calendlyUri ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Modules */}
      {activeModules.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-paper-3 uppercase tracking-widest mb-4">Active Modules</h2>
          <div className="grid grid-cols-4 gap-4">
            {activeModules.map((m) => (
              <div key={m.key} className="bg-ink-2 backdrop-blur-sm rounded-xl border border-rule p-4 flex items-center gap-3">
                <span className="text-2xl">{m.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-paper">{m.name}</p>
                  <p className="text-xs text-emerald-400">Active</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <div>
        <h2 className="text-xs font-semibold text-paper-3 uppercase tracking-widest mb-4">
          Contacts ({contactsTotal})
        </h2>
        <div className="bg-ink-2 backdrop-blur-sm rounded-2xl border border-rule overflow-x-auto">
          {contacts.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-paper-4 text-sm">No contacts yet.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-rule-soft bg-ink-1">
                  <th className="text-left px-6 py-3 text-[10px] font-semibold text-paper-4 uppercase tracking-widest">Contact</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold text-paper-4 uppercase tracking-widest">Email</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold text-paper-4 uppercase tracking-widest">Phone</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold text-paper-4 uppercase tracking-widest">Status</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold text-paper-4 uppercase tracking-widest">Score</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold text-paper-4 uppercase tracking-widest">Source</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold text-paper-4 uppercase tracking-widest">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule-soft">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-ink-2 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-paper text-sm">
                        {contact.firstName} {contact.lastName}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-paper-3 break-all">{contact.email}</td>
                    <td className="px-6 py-4 text-sm font-mono text-paper-3">{contact.phone ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full inline-block ${contactStatusColors[contact.status] ?? 'bg-slate-500/10 text-paper-3'}`}>
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-paper-3">{contact.leadScore}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full inline-block ${sourceColors[contact.source] ?? 'bg-slate-500/10 text-paper-3'}`}>
                        {contact.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-paper-4">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
