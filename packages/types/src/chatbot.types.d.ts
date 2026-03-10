export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
}
export interface ChatbotConfig {
    businessId: string;
    businessName: string;
    persona: string;
    systemPrompt: string;
    primaryColor?: string;
    logoUrl?: string;
    welcomeMessage: string;
    suggestedQuestions?: string[];
}
export interface WidgetConfig {
    businessId: string;
    apiUrl: string;
    primaryColor: string;
    businessName: string;
    welcomeMessage: string;
    logoUrl?: string;
    position?: 'bottom-right' | 'bottom-left';
}
export interface ChatCompletionRequest {
    sessionKey: string;
    businessId: string;
    channel: string;
    message: string;
    contactId?: string;
}
export interface ChatCompletionResponse {
    reply: string;
    sessionKey: string;
    actions?: ChatbotAction[];
}
export type ChatbotAction = {
    type: 'capture_lead';
    data: LeadCaptureData;
} | {
    type: 'book_appointment';
    data: BookingData;
} | {
    type: 'trigger_survey';
    data: {
        surveyId: string;
    };
} | {
    type: 'trigger_proposal';
    data: ProposalTriggerData;
};
export interface LeadCaptureData {
    name?: string;
    email?: string;
    phone?: string;
    interest?: string;
}
export interface BookingData {
    name: string;
    email: string;
    phone?: string;
    preferredDate?: string;
    preferredTime?: string;
    notes?: string;
}
export interface ProposalTriggerData {
    businessName?: string;
    contactEmail?: string;
    interest?: string;
}
//# sourceMappingURL=chatbot.types.d.ts.map