export interface LeadCreatedPayload {
    businessId: string;
    source: string;
    sourceId?: string;
    rawData: Record<string, unknown>;
}
export interface CallCompletedPayload {
    businessId: string;
    callSid: string;
    contactId?: string;
    intent: string;
    extractedData?: Record<string, unknown>;
    transcript?: string;
    duration: number;
}
export interface SurveyResponsePayload {
    businessId: string;
    surveyId: string;
    responseId: string;
    contactId?: string;
    answers: Record<string, unknown>;
}
export interface SurveyDeliveryPayload {
    businessId: string;
    surveyId: string;
    contactId: string;
    channel: 'sms' | 'email';
    delayMs?: number;
}
export interface AppointmentBookedPayload {
    businessId: string;
    appointmentId: string;
    contactId: string;
    startTime: string;
    calendlyEventId?: string;
}
export interface BusinessOnboardedPayload {
    businessId: string;
    businessName: string;
    businessType: string;
    email?: string;
    phone?: string;
}
export interface SmsJobPayload {
    to: string;
    from: string;
    body: string;
    businessId: string;
    contactId?: string;
}
export interface EmailJobPayload {
    to: string;
    from?: string;
    subject: string;
    html?: string;
    templateId?: string;
    dynamicData?: Record<string, unknown>;
    businessId: string;
    contactId?: string;
}
export interface PostSocialJobPayload {
    businessId: string;
    postId: string;
    platform: string;
}
export interface AutoDmJobPayload {
    businessId: string;
    platform: string;
    recipientId: string;
    recipientName?: string;
    context: string;
}
export interface ProposalViewedPayload {
    proposalId: string;
    businessId?: string;
    contactId?: string;
    shareToken: string;
}
export interface GenerateWebsiteJobPayload {
    businessId: string;
    websiteId: string;
    template: string;
    config: Record<string, unknown>;
}
export interface SequenceStepJobPayload {
    businessId: string;
    contactId: string;
    sequenceId: string;
    stepNumber: number;
    channel: 'sms' | 'email';
}
export interface ProspectDiscoveredPayload {
    campaignId: string;
    placeId: string;
    name: string;
    address: Record<string, unknown>;
    phone?: string;
    website?: string;
    email?: string;
}
export interface OutreachSendPayload {
    prospectId: string;
    campaignId: string;
    channel: 'email' | 'sms';
    stepNumber?: number;
}
//# sourceMappingURL=events.types.d.ts.map
