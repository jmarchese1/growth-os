'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
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
}

interface Props {
  business: Business;
}

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? process.env['API_BASE_URL'] ?? 'https://embedoapi-production.up.railway.app';

export function EditBusinessButton({ business }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Form state
  const [name, setName] = useState(business.name);
  const [type, setType] = useState(business.type);
  const [status, setStatus] = useState(business.status);
  const [phone, setPhone] = useState(business.phone ?? '');
  const [email, setEmail] = useState(business.email ?? '');
  const [website, setWebsite] = useState(business.website ?? '');
  const [street, setStreet] = useState(business.address?.street ?? '');
  const [city, setCity] = useState(business.address?.city ?? '');
  const [state, setState] = useState(business.address?.state ?? '');
  const [zip, setZip] = useState(business.address?.zip ?? '');
  const [timezone, setTimezone] = useState(business.timezone ?? '');
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState(business.twilioPhoneNumber ?? '');
  const [elevenLabsAgentId, setElevenLabsAgentId] = useState(business.elevenLabsAgentId ?? '');
  const [calendlyUri, setCalendlyUri] = useState(business.calendlyUri ?? '');

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      const address: Record<string, string> = {};
      if (street) address.street = street;
      if (city) address.city = city;
      if (state) address.state = state;
      if (zip) address.zip = zip;

      const payload = {
        name,
        type,
        status,
        phone: phone || undefined,
        email: email || undefined,
        website: website || undefined,
        address: Object.keys(address).length > 0 ? address : undefined,
        timezone: timezone || undefined,
        twilioPhoneNumber: twilioPhoneNumber || undefined,
        elevenLabsAgentId: elevenLabsAgentId || undefined,
        calendlyUri: calendlyUri || undefined,
      };

      const res = await fetch(`${API_URL}/businesses/${business.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to update business');
        return;
      }

      router.refresh();
      setOpen(false);
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full px-3 py-2.5 bg-ink-2 border border-rule rounded-lg text-sm text-white placeholder:text-paper-4 focus:outline-none focus:ring-1 focus:ring-signal focus:border-signal transition-colors';
  const labelCls = 'block text-xs font-semibold text-paper-3 mb-1.5 uppercase tracking-wide';
  const selectCls = inputCls + ' cursor-pointer';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-signal text-ink-0 text-white text-sm font-semibold rounded-lg hover:bg-paper hover:text-ink-0 transition-colors"
      >
        Edit Business
      </button>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-[#171717] border border-rule rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-rule flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-white">Edit Business</h2>
                <p className="text-xs text-paper-4 mt-0.5">Update business information and integrations</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-paper-4 hover:text-white transition-colors text-xl leading-none">✕</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-paper-3 uppercase tracking-wide">Basic Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Type</label>
                    <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
                      <option value="RESTAURANT">Restaurant</option>
                      <option value="SALON">Salon</option>
                      <option value="RETAIL">Retail</option>
                      <option value="FITNESS">Fitness</option>
                      <option value="MEDICAL">Medical</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
                      <option value="PENDING">Pending</option>
                      <option value="PROVISIONING">Provisioning</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Timezone</label>
                    <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="e.g., America/New_York" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-paper-3 uppercase tracking-wide">Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Website</label>
                    <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-paper-3 uppercase tracking-wide">Location</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Street</label>
                    <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>City</label>
                      <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>State</label>
                      <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="CA" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>ZIP</label>
                      <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Integrations */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-paper-3 uppercase tracking-wide">Integrations</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Twilio Phone Number</label>
                    <input type="tel" value={twilioPhoneNumber} onChange={(e) => setTwilioPhoneNumber(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>ElevenLabs Agent ID</label>
                    <input type="text" value={elevenLabsAgentId} onChange={(e) => setElevenLabsAgentId(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Cal.com URI</label>
                    <input type="text" value={calendlyUri} onChange={(e) => setCalendlyUri(e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-rule flex-shrink-0">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-5 py-2 bg-signal text-ink-0 text-white text-sm font-semibold rounded-lg hover:bg-paper hover:text-ink-0 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-5 py-2 bg-ink-2 text-paper-3 text-sm font-medium rounded-lg hover:bg-ink-3 hover:text-white transition-colors border border-rule"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
