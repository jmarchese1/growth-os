// Proposal engine domain types

export interface ProposalIntakeData {
  businessName: string;
  industry: string;
  size: 'solo' | 'small' | 'medium' | 'large'; // 1, 2-10, 11-50, 50+
  location: string;
  currentSystems?: string;  // what tools they currently use
  goals?: string;           // what they want to achieve
  monthlyRevenue?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface ProposalContent {
  executiveSummary: string;
  problemStatement: string;
  solution: string;
  modules: ProposalModule[];
  expectedBenefits: string[];
  investmentOverview: string;
  timeline: string;
  nextSteps: string;
  callToAction: string;
}

export interface ProposalModule {
  name: string;
  description: string;
  benefits: string[];
  included: boolean;
}

export interface GenerateProposalRequest {
  intakeData: ProposalIntakeData;
  businessId?: string;  // if for an existing business
  contactId?: string;
}

export interface GenerateProposalResponse {
  proposalId: string;
  shareUrl: string;
  pdfUrl?: string;
}
