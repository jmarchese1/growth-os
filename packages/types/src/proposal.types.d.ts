export interface ProposalIntakeData {
    businessName: string;
    industry: string;
    size: 'solo' | 'small' | 'medium' | 'large';
    location: string;
    currentSystems?: string;
    goals?: string;
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
    businessId?: string;
    contactId?: string;
}
export interface GenerateProposalResponse {
    proposalId: string;
    shareUrl: string;
    pdfUrl?: string;
}
//# sourceMappingURL=proposal.types.d.ts.map