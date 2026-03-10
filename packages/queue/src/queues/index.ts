import { Queue } from 'bullmq';
import { getRedisConnection } from '../connection.js';
import type {
  SmsJobPayload,
  EmailJobPayload,
  LeadCreatedPayload,
  CallCompletedPayload,
  SurveyResponsePayload,
  SurveyDeliveryPayload,
  AppointmentBookedPayload,
  BusinessOnboardedPayload,
  PostSocialJobPayload,
  AutoDmJobPayload,
  ProposalViewedPayload,
  GenerateWebsiteJobPayload,
  SequenceStepJobPayload,
  ProspectDiscoveredPayload,
  OutreachSendPayload,
} from '@embedo/types';

// ─── Queue Names ──────────────────────────────────────────────────────────────
export const QUEUE_NAMES = {
  SMS: 'embedo-sms',
  EMAIL: 'embedo-email',
  LEAD_CREATED: 'embedo-lead.created',
  CALL_COMPLETED: 'embedo-call.completed',
  SURVEY_RESPONSE: 'embedo-survey.response',
  SURVEY_DELIVERY: 'embedo-survey.delivery',
  APPOINTMENT_BOOKED: 'embedo-appointment.booked',
  BUSINESS_ONBOARDED: 'embedo-business.onboarded',
  SOCIAL_POST: 'embedo-social.post',
  AUTO_DM: 'embedo-social.autodm',
  PROPOSAL_VIEWED: 'embedo-proposal.viewed',
  WEBSITE_GENERATE: 'embedo-website.generate',
  SEQUENCE_STEP: 'embedo-sequence.step',
  PROSPECT_DISCOVERED: 'embedo-prospect.discovered',
  OUTREACH_SEND: 'embedo-outreach.send',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Queue Instances (lazy-initialized) ──────────────────────────────────────
const queues = new Map<string, Queue>();

function getQueue<T>(name: string): Queue<T> {
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue<T>(name, {
        connection: getRedisConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      }),
    );
  }
  return queues.get(name) as Queue<T>;
}

// ─── Typed Queue Accessors ────────────────────────────────────────────────────
export const smsQueue = () => getQueue<SmsJobPayload>(QUEUE_NAMES.SMS);
export const emailQueue = () => getQueue<EmailJobPayload>(QUEUE_NAMES.EMAIL);
export const leadCreatedQueue = () => getQueue<LeadCreatedPayload>(QUEUE_NAMES.LEAD_CREATED);
export const callCompletedQueue = () => getQueue<CallCompletedPayload>(QUEUE_NAMES.CALL_COMPLETED);
export const surveyResponseQueue = () => getQueue<SurveyResponsePayload>(QUEUE_NAMES.SURVEY_RESPONSE);
export const surveyDeliveryQueue = () => getQueue<SurveyDeliveryPayload>(QUEUE_NAMES.SURVEY_DELIVERY);
export const appointmentBookedQueue = () => getQueue<AppointmentBookedPayload>(QUEUE_NAMES.APPOINTMENT_BOOKED);
export const businessOnboardedQueue = () => getQueue<BusinessOnboardedPayload>(QUEUE_NAMES.BUSINESS_ONBOARDED);
export const socialPostQueue = () => getQueue<PostSocialJobPayload>(QUEUE_NAMES.SOCIAL_POST);
export const autoDmQueue = () => getQueue<AutoDmJobPayload>(QUEUE_NAMES.AUTO_DM);
export const proposalViewedQueue = () => getQueue<ProposalViewedPayload>(QUEUE_NAMES.PROPOSAL_VIEWED);
export const websiteGenerateQueue = () => getQueue<GenerateWebsiteJobPayload>(QUEUE_NAMES.WEBSITE_GENERATE);
export const sequenceStepQueue = () => getQueue<SequenceStepJobPayload>(QUEUE_NAMES.SEQUENCE_STEP);

export const prospectDiscoveredQueue = () => getQueue<ProspectDiscoveredPayload>(QUEUE_NAMES.PROSPECT_DISCOVERED);
export const outreachSendQueue = () => getQueue<OutreachSendPayload>(QUEUE_NAMES.OUTREACH_SEND);

export async function closeAllQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
}
