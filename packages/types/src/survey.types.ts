// Survey engine domain types

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'rating'
  | 'multiple_choice'
  | 'checkbox'
  | 'email'
  | 'phone'
  | 'number';

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];       // for multiple_choice / checkbox
  min?: number;             // for rating / number
  max?: number;
}

export interface SurveySchema {
  questions: SurveyQuestion[];
  submitLabel?: string;
  successMessage?: string;
  redirectUrl?: string;
}

export interface SurveyResponseData {
  surveyId: string;
  answers: Record<string, unknown>;
  respondentEmail?: string;
  respondentPhone?: string;
  respondentName?: string;
  contactId?: string;
}

export interface SurveyDeliveryRequest {
  surveyId: string;
  contactId: string;
  channel: 'sms' | 'email';
}
