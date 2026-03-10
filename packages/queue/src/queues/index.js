"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outreachSendQueue = exports.prospectDiscoveredQueue = exports.sequenceStepQueue = exports.websiteGenerateQueue = exports.proposalViewedQueue = exports.autoDmQueue = exports.socialPostQueue = exports.businessOnboardedQueue = exports.appointmentBookedQueue = exports.surveyDeliveryQueue = exports.surveyResponseQueue = exports.callCompletedQueue = exports.leadCreatedQueue = exports.emailQueue = exports.smsQueue = exports.QUEUE_NAMES = void 0;
exports.closeAllQueues = closeAllQueues;
const bullmq_1 = require("bullmq");
const connection_js_1 = require("../connection.js");
// ─── Queue Names ──────────────────────────────────────────────────────────────
exports.QUEUE_NAMES = {
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
};
// ─── Queue Instances (lazy-initialized) ──────────────────────────────────────
const queues = new Map();
function getQueue(name) {
    if (!queues.has(name)) {
        queues.set(name, new bullmq_1.Queue(name, {
            connection: (0, connection_js_1.getRedisConnection)(),
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: { count: 100 },
                removeOnFail: { count: 500 },
            },
        }));
    }
    return queues.get(name);
}
// ─── Typed Queue Accessors ────────────────────────────────────────────────────
const smsQueue = () => getQueue(exports.QUEUE_NAMES.SMS);
exports.smsQueue = smsQueue;
const emailQueue = () => getQueue(exports.QUEUE_NAMES.EMAIL);
exports.emailQueue = emailQueue;
const leadCreatedQueue = () => getQueue(exports.QUEUE_NAMES.LEAD_CREATED);
exports.leadCreatedQueue = leadCreatedQueue;
const callCompletedQueue = () => getQueue(exports.QUEUE_NAMES.CALL_COMPLETED);
exports.callCompletedQueue = callCompletedQueue;
const surveyResponseQueue = () => getQueue(exports.QUEUE_NAMES.SURVEY_RESPONSE);
exports.surveyResponseQueue = surveyResponseQueue;
const surveyDeliveryQueue = () => getQueue(exports.QUEUE_NAMES.SURVEY_DELIVERY);
exports.surveyDeliveryQueue = surveyDeliveryQueue;
const appointmentBookedQueue = () => getQueue(exports.QUEUE_NAMES.APPOINTMENT_BOOKED);
exports.appointmentBookedQueue = appointmentBookedQueue;
const businessOnboardedQueue = () => getQueue(exports.QUEUE_NAMES.BUSINESS_ONBOARDED);
exports.businessOnboardedQueue = businessOnboardedQueue;
const socialPostQueue = () => getQueue(exports.QUEUE_NAMES.SOCIAL_POST);
exports.socialPostQueue = socialPostQueue;
const autoDmQueue = () => getQueue(exports.QUEUE_NAMES.AUTO_DM);
exports.autoDmQueue = autoDmQueue;
const proposalViewedQueue = () => getQueue(exports.QUEUE_NAMES.PROPOSAL_VIEWED);
exports.proposalViewedQueue = proposalViewedQueue;
const websiteGenerateQueue = () => getQueue(exports.QUEUE_NAMES.WEBSITE_GENERATE);
exports.websiteGenerateQueue = websiteGenerateQueue;
const sequenceStepQueue = () => getQueue(exports.QUEUE_NAMES.SEQUENCE_STEP);
exports.sequenceStepQueue = sequenceStepQueue;
const prospectDiscoveredQueue = () => getQueue(exports.QUEUE_NAMES.PROSPECT_DISCOVERED);
exports.prospectDiscoveredQueue = prospectDiscoveredQueue;
const outreachSendQueue = () => getQueue(exports.QUEUE_NAMES.OUTREACH_SEND);
exports.outreachSendQueue = outreachSendQueue;
async function closeAllQueues() {
    await Promise.all([...queues.values()].map((q) => q.close()));
    queues.clear();
}
//# sourceMappingURL=index.js.map