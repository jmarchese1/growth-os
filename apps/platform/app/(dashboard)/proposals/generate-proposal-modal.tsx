'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? process.env['API_BASE_URL'] ?? 'https://embedoapi-production.up.railway.app';
const PROPOSAL_ENGINE_URL = process.env['NEXT_PUBLIC_PROPOSAL_ENGINE_URL'] ?? 'http://localhost:3008';

interface Business {
  id: string;
  name: string;
  type: string;
}

interface GeneratedProposal {
  proposalId: string;
  shareUrl: string;
  content: unknown;
}

export function GenerateProposalModal({
  onClose,
  onProposalGenerated,
}: {
  onClose: () => void;
  onProposalGenerated: (proposal: any) => void;
}) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [formData, setFormData] = useState({
    businessName: '',
    industry: '',
    size: 'small' as const,
    location: '',
    currentSystems: '',
    goals: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState<GeneratedProposal | null>(null);

  useEffect(() => {
    async function fetchBusinesses() {
      try {
        const res = await fetch(`${API_URL}/businesses?pageSize=100`);
        if (res.ok) {
          const data = await res.json();
          setBusinesses(data.items ?? []);
        }
      } catch (err) {
        console.error('Failed to fetch businesses:', err);
      }
    }

    fetchBusinesses();
  }, []);

  const handleSelectBusiness = (businessId: string) => {
    const business = businesses.find((b) => b.id === businessId);
    if (business) {
      setSelectedBusinessId(businessId);
      setFormData((prev) => ({
        ...prev,
        businessName: business.name,
        industry: business.type,
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${PROPOSAL_ENGINE_URL}/proposals/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...(selectedBusinessId && { businessId: selectedBusinessId }),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate proposal');
      }

      const data: GeneratedProposal = await res.json();
      setGenerated(data);

      // Notify parent after a short delay to show the confirmation
      setTimeout(() => {
        onProposalGenerated({
          id: data.proposalId,
          shareToken: data.shareUrl.split('/').pop(),
          status: 'DRAFT',
          viewedAt: null,
          acceptedAt: null,
          createdAt: new Date().toISOString(),
          intakeData: formData,
        });
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (generated) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-[#0c0a18] rounded-2xl border border-white/10 max-w-2xl w-full p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Proposal Generated!</h2>
            <p className="text-slate-400 mt-2">Your proposal has been created successfully.</p>
          </div>

          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-4">
              <p className="text-sm text-emerald-400 font-medium">✓ Proposal created for {formData.businessName}</p>
              <p className="text-xs text-slate-400 mt-1">Share link: {generated.shareUrl}</p>
            </div>

            <div className="flex gap-3">
              <a
                href={generated.shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors text-center"
              >
                View Proposal →
              </a>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#0c0a18] rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 space-y-6" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="text-2xl font-bold text-white">Generate New Proposal</h2>
          <p className="text-slate-400 mt-1 text-sm">Create an AI-powered proposal for a business prospect.</p>
        </div>

        <form onSubmit={handleGenerateProposal} className="space-y-6">
          {/* Business Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Select Business (Optional)</label>
            <select
              value={selectedBusinessId}
              onChange={(e) => handleSelectBusiness(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            >
              <option value="">-- Choose a business to prefill --</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Business Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Business Name *</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Industry *</label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                required
                placeholder="e.g., Restaurant, Salon, Fitness"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Business Size *</label>
              <select
                name="size"
                value={formData.size}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-violet-500"
              >
                <option value="solo">Solo</option>
                <option value="small">Small (2-10)</option>
                <option value="medium">Medium (11-50)</option>
                <option value="large">Large (50+)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Location *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
                placeholder="e.g., Austin, TX"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Contact Name</label>
              <input
                type="text"
                name="contactName"
                value={formData.contactName}
                onChange={handleInputChange}
                placeholder="e.g., John Smith"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Email</label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                placeholder="john@example.com"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Phone</label>
            <input
              type="tel"
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleInputChange}
              placeholder="+1-555-0000"
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Business Context */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Current Systems / Tech Stack</label>
            <textarea
              name="currentSystems"
              value={formData.currentSystems}
              onChange={handleInputChange}
              placeholder="e.g., Using Square POS, basic website, no automation..."
              rows={3}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Goals & Challenges</label>
            <textarea
              name="goals"
              value={formData.goals}
              onChange={handleInputChange}
              placeholder="e.g., Want to automate phone ordering, improve customer engagement, reduce no-shows..."
              rows={3}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          {error && <div className="bg-red-500/15 border border-red-500/25 rounded-lg p-4 text-red-400 text-sm">{error}</div>}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate Proposal'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
