'use client';

import { useEffect, useState } from 'react';
import { Plus, FileText, ArrowUpRight } from 'lucide-react';
import { GenerateProposalModal } from './generate-proposal-modal';
import { ProposalPreviewModal } from './proposal-preview-modal';
import { SectionHeader, HeroMetric, MetricBlock, Button } from '../../../components/ui/primitives';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'https://embedoapi-production.up.railway.app';

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

const statusColor: Record<string, string> = {
  DRAFT:    'text-paper-3',
  SENT:     'text-[#63b7ff]',
  VIEWED:   'text-amber',
  ACCEPTED: 'text-signal',
  DECLINED: 'text-ember',
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
        const res = await fetch(`${API_URL}/proposals?pageSize=50`);
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
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-14">
      {/* Masthead */}
      <section className="pb-10 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
            Chapter 08 · Proposals
          </span>
          <span className="h-px w-16 bg-rule" />
          <span className="font-mono text-[10px] tracking-mega text-paper-3 uppercase">
            {total} generated
          </span>
        </div>
        <div className="flex items-end justify-between gap-8">
          <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[64px] lg:text-[76px] max-w-3xl">
            AI proposals.
          </h1>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus className="w-3 h-3" />
            <span>Generate new</span>
          </Button>
        </div>
        <p className="font-ui text-paper-2 text-[15px] mt-5 max-w-xl leading-relaxed">
          Generated with Sonnet, hosted on shareable links, tracked from first view to acceptance.
        </p>
      </section>

      {/* Summary */}
      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-5">
          <HeroMetric label="Proposals in circulation" value={total} caption={`${viewed} viewed, ${accepted} accepted`} size="md" />
        </div>
        <div className="col-span-12 lg:col-span-7 panel">
          <div className="grid grid-cols-3">
            <MetricBlock label="Total" value={total} />
            <MetricBlock label="Viewed" value={viewed} delta={total > 0 ? `${Math.round((viewed/total)*100)}% open` : ''} trend={viewed > 0 ? 'up' : 'flat'} />
            <MetricBlock label="Accepted" value={accepted} delta={viewed > 0 ? `${Math.round((accepted/viewed)*100)}% of viewed` : ''} trend={accepted > 0 ? 'up' : 'flat'} />
          </div>
        </div>
      </section>

      {/* Ledger */}
      <section>
        <SectionHeader numeral="1" title="The ledger" subtitle={`${total} proposals on file`} />

        <div className="mt-6 panel overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <p className="font-mono text-[11px] tracking-micro uppercase text-paper-4">Loading…</p>
            </div>
          ) : proposals.length === 0 ? (
            <div className="p-20 text-center">
              <FileText className="w-8 h-8 text-paper-4 mx-auto mb-4" />
              <p className="font-display italic text-paper-3 text-2xl font-light">No proposals yet.</p>
              <button onClick={() => setShowModal(true)} className="font-mono text-[11px] tracking-micro uppercase text-signal hover:underline mt-4 inline-block">
                Generate the first proposal →
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="hairline-b">
                  <Th>Business</Th>
                  <Th>Contact</Th>
                  <Th>Industry</Th>
                  <Th>Status</Th>
                  <Th align="right">Created</Th>
                  <Th align="right"> </Th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal, idx) => (
                  <tr key={proposal.id} className="hairline-b last:border-0 hover:bg-ink-2 transition-colors group">
                    <td className="px-5 py-4 min-w-[220px]">
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-[10px] text-paper-4 pt-1 shrink-0">
                          №{(idx + 1).toString().padStart(3, '0')}
                        </span>
                        <span className="font-display italic text-paper text-lg font-light leading-tight">
                          {proposal.intakeData.businessName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {proposal.intakeData.contactName && (
                        <p className="font-ui text-sm text-paper">{proposal.intakeData.contactName}</p>
                      )}
                      {proposal.intakeData.contactEmail && (
                        <p className="font-mono text-[10px] text-paper-4 mt-0.5">{proposal.intakeData.contactEmail}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-[10px] tracking-micro uppercase text-paper-3">
                      {proposal.intakeData.industry}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`font-mono text-[10px] tracking-mega uppercase ${statusColor[proposal.status] ?? 'text-paper-3'}`}>
                        {proposal.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-[11px] text-paper-3 nums">
                      {new Date(proposal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setPreviewProposal(proposal)}
                          className="font-mono text-[10px] tracking-mega uppercase text-paper-3 hover:text-signal transition-colors"
                        >
                          Preview
                        </button>
                        <a
                          href={`https://embedo.io/proposal/${proposal.shareToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[10px] tracking-mega uppercase text-paper-4 hover:text-signal transition-colors"
                        >
                          <span>Link</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

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

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-4 py-3 font-mono text-[9px] tracking-mega uppercase text-paper-4 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}
