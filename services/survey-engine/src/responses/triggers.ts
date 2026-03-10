import { db } from '@embedo/db';
import { smsQueue, emailQueue, leadCreatedQueue } from '@embedo/queue';
import { createLogger } from '@embedo/utils';
import type { SurveyResponseData } from '@embedo/types';

const log = createLogger('survey-engine:triggers');

/**
 * Process a survey response and fire appropriate automations.
 * Called after every survey submission.
 */
export async function processSurveyTriggers(params: {
  surveyId: string;
  businessId: string;
  responseData: SurveyResponseData;
  contactId?: string;
}): Promise<void> {
  const { surveyId, businessId, responseData, contactId } = params;

  // Get survey and business info
  const [survey, business] = await Promise.all([
    db.survey.findUnique({ where: { id: surveyId } }),
    db.business.findUnique({ where: { id: businessId } }),
  ]);

  if (!survey || !business) return;

  // Store the response
  const response = await db.surveyResponse.create({
    data: {
      surveyId,
      contactId,
      answers: responseData.answers as object,
      triggeredAt: new Date(),
    },
  });

  log.info({ surveyId, responseId: response.id }, 'Survey response saved');

  // Emit lead.created if contact info was provided
  if (responseData.respondentEmail || responseData.respondentPhone) {
    await leadCreatedQueue().add(`lead:survey:${response.id}`, {
      businessId,
      source: 'SURVEY',
      sourceId: response.id,
      rawData: {
        email: responseData.respondentEmail,
        phone: responseData.respondentPhone,
        name: responseData.respondentName,
        surveyId,
      },
    });
  }

  // Check for satisfaction score and trigger promotion
  const rating = extractRating(responseData.answers);

  if (rating !== null) {
    if (rating >= 4 && responseData.respondentPhone) {
      // High satisfaction — send a thank you + promotion
      const fromNumber = business.twilioPhoneNumber ?? env_from();
      await smsQueue().add(`survey-promo:${response.id}`, {
        to: responseData.respondentPhone,
        from: fromNumber,
        body: `Thank you for visiting ${business.name}! We appreciate your kind feedback. Here's a special offer just for you: show this message for 10% off your next visit! 🎉`,
        businessId,
        contactId,
      });
    } else if (rating <= 2 && responseData.respondentPhone) {
      // Low satisfaction — recovery message
      await smsQueue().add(`survey-recovery:${response.id}`, {
        to: responseData.respondentPhone,
        from: env_from(),
        body: `We're sorry to hear about your experience at ${business.name}. We'd love to make it right. Please reply to this message or call us directly.`,
        businessId,
        contactId,
      });
    }
  }
}

function extractRating(answers: Record<string, unknown>): number | null {
  for (const value of Object.values(answers)) {
    if (typeof value === 'number' && value >= 1 && value <= 5) {
      return value;
    }
    const num = parseInt(String(value));
    if (!isNaN(num) && num >= 1 && num <= 5) {
      return num;
    }
  }
  return null;
}

function env_from(): string {
  return process.env['TWILIO_FROM_NUMBER'] ?? '';
}
