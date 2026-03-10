// Voice agent domain types

export interface ElevenLabsAgentConfig {
  businessId: string;
  businessName: string;
  persona: string;
  systemPrompt: string;
  firstMessage: string;
  language?: string;
  voiceId?: string;
}

export interface TwilioInboundPayload {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  AccountSid: string;
}

export interface CallCompletedEvent {
  businessId: string;
  callSid: string;
  from: string;
  duration: number;
  transcript?: string;
  summary?: string;
  sentiment?: string;
  intent?: string;
  extractedData?: ExtractedCallData;
}

export interface ExtractedCallData {
  name?: string;
  phone?: string;
  email?: string;
  reservationDate?: string;
  reservationTime?: string;
  partySize?: number;
  specialRequests?: string;
  [key: string]: unknown;
}

export interface ReservationRequest {
  businessId: string;
  contactName: string;
  contactPhone: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests?: string;
}
