// Lead engine domain types

export interface LeadCreateInput {
  businessId: string;
  source: string;
  sourceId?: string;
  rawData: RawLeadData;
}

export interface RawLeadData {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  interest?: string;
  message?: string;
  [key: string]: unknown;
}

export interface NormalizedLead {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source: string;
  tags: string[];
}

export interface SequenceStep {
  stepNumber: number;
  delayHours: number;
  message?: string;         // for SMS
  subject?: string;         // for email
  templateId?: string;      // SendGrid template ID
  body?: string;
}

export interface SmsJob {
  to: string;
  from: string;
  body: string;
  businessId: string;
  contactId?: string;
}

export interface EmailJob {
  to: string;
  from: string;
  subject: string;
  html?: string;
  templateId?: string;
  dynamicData?: Record<string, unknown>;
  businessId: string;
  contactId?: string;
}
