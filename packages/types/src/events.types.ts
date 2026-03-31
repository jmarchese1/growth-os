// BullMQ job payload types — the event bus contracts

// Lead Events
export interface LeadCreatedPayload {
  businessId: string;
  source: string;
  sourceId?: string;
  rawData: Record<string, unknown>;
}

// Call Events
export interface CallCompletedPayload {
  businessId: string;
  callSid: string;
  contactId?: string;
  intent: string;
  extractedData?: Record<string, unknown>;
  transcript?: string;
  summary?: string;
  sentiment?: string;
  duration: number;
}

// Survey Events
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

// Appointment Events
export interface AppointmentBookedPayload {
  businessId: string;
  appointmentId: string;
  contactId: string;
  startTime: string;
  calendlyEventId?: string;
}

// Business Lifecycle Events
export interface BusinessOnboardedPayload {
  businessId: string;
  businessName: string;
  businessType: string;
  email?: string;
  phone?: string;
}

// Messaging Jobs
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

// Social Jobs
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

// Proposal Events
export interface ProposalViewedPayload {
  proposalId: string;
  businessId?: string;
  contactId?: string;
  shareToken: string;
}

// Website Generation Jobs
export interface GenerateWebsiteJobPayload {
  businessId: string;
  websiteId: string;
  template: string;
  config: Record<string, unknown>;
}

// Sequence Jobs
export interface SequenceStepJobPayload {
  businessId: string;
  contactId: string;
  sequenceId: string;
  stepNumber: number;
  channel: 'sms' | 'email';
}

// Reservation Events
export interface ReservationCreatedPayload {
  businessId: string;
  reservationId: string;
  contactId?: string;
  guestName: string;
  partySize: number;
  date: string;
  time: string;
  source: string;
}

// Order Events
export interface OrderCreatedPayload {
  businessId: string;
  orderId: string;
  contactId?: string;
  customerName: string;
  itemCount: number;
  total: number;
  source: string;
  pickupTime?: string;
}

// Outbound Prospecting Jobs
export interface ProspectDiscoveredPayload {
  campaignId: string;
  placeId: string;
  name: string;
  address: Record<string, unknown>;
  categories?: string[];  // Geoapify categories e.g. ["catering.restaurant.pizza"]
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
