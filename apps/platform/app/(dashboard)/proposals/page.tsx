'use client';

import { useEffect, useState } from 'react';
import { GenerateProposalModal } from './generate-proposal-modal';
import { ProposalPreviewModal } from './proposal-preview-modal';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? process.env['API_BASE_URL'] ?? 'https://embedoapi-production.up.railway.app';
const PROPOSAL_ENGINE_URL = process.env['NEXT_PUBLIC_PROPOSAL_ENGINE_URL'] ?? 'http://localhost:3008';

interface ProposalIntakeData {
  businessName: string;
  industry: string;
  size: string;
  location: string;
  currentSystems?: string;
  goals?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

interface Proposal {
  id: string;
  shareToken: string;
  status: string;
  viewedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  intakeData: ProposalIntakeData;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
  SENT: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  VIEWED: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  ACCEPTED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  DECLINED: 'bg-red-500/15 text-red-400 border-red-500/25',
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [previewProposal, setPreviewProposal] = useState<Proposal | null>(null);

  const viewed = proposals.filter((p) => p.viewedAt).length;
  const accepted = proposals.filter((p) => p.acceptedAt).length;

  useEffect(() => {
    async function fetchProposals() {
      try {
        const res = await fetch(`${PROPOSAL_ENGINE_URL}/proposals?pageSize=50`);
        if (res.ok) {
          const data = await res.json();
          setProposals(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      } catch (err) {
        console.error('Failed to fetch proposals:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProposals();
  }, []);

  const handleProposalGenerated = (newProposal: Proposal) => {
    setProposals((prev) => [newProposal, ...prev]);
    setTotal((prev) => prev + 1);
    setShowModal(false);
  };

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Proposals</h1>
          <p className="text-slate-400 mt-1 text-sm">{total} total proposals</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors"
        >
          + Generate New
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <p className="text-slate-400 text-sm font-medium">Total Proposals</p>
          <p className="text-3xl font-bold text-white mt-2">{total}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <p className="text-slate-400 text-sm font-medium">Viewed</p>
          <p className="text-3xl font-bold text-amber-400 mt-2">{viewed}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <p className="text-slate-400 text-sm font-medium">Accepted</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">{accepted}</p>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-x-auto">
        {loading ? (
          <div className="p-16 text-center">
            <p className="text-slate-500 text-sm">Loading proposals...</p>
          </div>
        ) : proposals.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-slate-500 text-sm">No proposals yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 inline-block text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Generate your first proposal →
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Business</th>
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Contact</th>
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Industry</th>
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Created</th>
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {proposals.map((proposal) => (
                <tr key={proposal.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-4 font-semibold text-white">{proposal.intakeData.businessName}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {proposal.intakeData.contactName && <p>{proposal.intakeData.contactName}</p>}
                    {proposal.intakeData.contactEmail && <p className="text-xs text-slate-500">{proposal.intakeData.contactEmail}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 capitalize">{proposal.intakeData.industry}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[proposal.status] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                      {proposal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{new Date(proposal.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button onClick={() => setPreviewProposal(proposal)} className="text-violet-400 hover:text-violet-300 transition-colors">
                        Preview
                      </button>
                      <span className="text-slate-600">•</span>
                      <a href={`https://embedo.io/proposal/${proposal.shareToken}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-300 transition-colors">
                        Public Link
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <GenerateProposalModal onClose={() => setShowModal(false)} onProposalGenerated={handleProposalGenerated} />}
      {previewProposal && (
        <ProposalPreviewModal
          proposal={previewProposal}
          onClose={() => setPreviewProposal(null)}
          onSent={(updatedProposal) => {
            setProposals((prev) => prev.map((p) => (p.id === updatedProposal.id ? updatedProposal : p)));
            setPreviewProposal(null);
          }}
        />
      )}
    </div>
  );
}
