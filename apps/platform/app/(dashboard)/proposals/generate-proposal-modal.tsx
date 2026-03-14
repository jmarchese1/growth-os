'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'https://embedoapi-production.up.railway.app';

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

function OrbitLoader({ businessName }: { businessName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      {/* Orbiting rings */}
      <div className="relative w-32 h-32">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border border-violet-500/20 animate-spin" style={{ animationDuration: '8s' }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_2px_rgba(139,92,246,0.8)]" />
        </div>
        {/* Middle ring */}
        <div className="absolute inset-3 rounded-full border border-indigo-500/30 animate-spin" style={{ animationDuration: '5s', animationDirection: 'reverse' }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_2px_rgba(99,102,241,0.8)]" />
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_2px_rgba(99,102,241,0.8)]" />
        </div>
        {/* Inner ring */}
        <div className="absolute inset-6 rounded-full border border-purple-500/40 animate-spin" style={{ animationDuration: '3s' }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-300 shadow-[0_0_4px_2px_rgba(216,180,254,0.8)]" />
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-1 h-1 rounded-full bg-purple-300 shadow-[0_0_4px_2px_rgba(216,180,254,0.8)]" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-300 shadow-[0_0_4px_2px_rgba(216,180,254,0.8)]" />
        </div>
        {/* Center pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-violet-500/80 animate-pulse shadow-[0_0_12px_4px_rgba(139,92,246,0.6)]" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-white font-semibold text-lg">Generating Proposal</p>
        {businessName && (
          <p className="text-slate-400 text-sm">for <span className="text-violet-300">{businessName}</span></p>
        )}
        <p className="text-slate-600 text-xs">Claude is writing your AI transformation proposal...</p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-violet-500/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
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
      const res = await fetch(`${API_URL}/proposals/generate`, {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    if (generated) {
      onProposalGenerated({
        id: generated.proposalId,
        shareToken: generated.shareUrl.split('/').pop(),
        status: 'DRAFT',
        viewedAt: null,
        acceptedAt: null,
        createdAt: new Date().toISOString(),
        intakeData: formData,
      });
    }
    onClose();
  };

  // Loading state — full modal replaced with orbit animation
  if (loading) {
    return createPortal(
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-[#0c0a18] rounded-2xl border border-white/10 max-w-md w-full p-8">
          <OrbitLoader businessName={formData.businessName} />
        </div>
      </div>,
      document.body
    );
  }

  // Success state — stays open until user clicks Done or View Proposal
  if (generated) {
    return createPortal(
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-[#0c0a18] rounded-2xl border border-white/10 max-w-2xl w-full p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-emerald-400">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">Proposal Generated!</h2>
            <p className="text-slate-400 text-sm">Your AI proposal for <span className="text-white font-medium">{formData.businessName}</span> is ready.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Share Link</p>
            <p className="text-sm text-violet-300 break-all font-mono">{generated.shareUrl}</p>
          </div>

          <div className="flex gap-3">
            <a
              href={generated.shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors text-center"
            >
              View Proposal →
            </a>
            <button
              onClick={handleDone}
              className="flex-1 px-4 py-2.5 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-colors"
            >
              Done
            </button>
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
              Generate Proposal
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
