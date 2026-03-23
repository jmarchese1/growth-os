import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';

const log = createLogger('api:reviews');

const DEFAULT_REVIEW_SETTINGS = {
  enabled: false,
  googleReviewUrl: '',
  goodThreshold: 'GOOD' as const,
  autoSendDelay: 30,
  goodMessage:
    "Thanks for the kind words! We'd love it if you shared your experience: {reviewUrl}",
  badMessage:
    "We're sorry your experience wasn't great. We'd love to make it right — reply to this message or call us anytime.",
};

interface ReviewSettings {
  enabled: boolean;
  googleReviewUrl: string;
  goodThreshold: 'GOOD' | 'EXCELLENT';
  autoSendDelay: number;
  goodMessage: string;
  badMessage: string;
}

const RATING_ORDER = ['TERRIBLE', 'POOR', 'OKAY', 'GOOD', 'EXCELLENT'] as const;

function meetsThreshold(rating: string, threshold: 'GOOD' | 'EXCELLENT'): boolean {
  const ratingIdx = RATING_ORDER.indexOf(rating as (typeof RATING_ORDER)[number]);
  const thresholdIdx = RATING_ORDER.indexOf(threshold);
  return ratingIdx >= thresholdIdx;
}

function isBadRating(rating: string): boolean {
  return rating === 'TERRIBLE' || rating === 'POOR';
}

export async function reviewRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /businesses/:id/review-settings
   */
  app.get<{ Params: { id: string } }>(
    '/businesses/:id/review-settings',
    async (request, _reply) => {
      const business = await db.business.findUnique({
        where: { id: request.params.id },
        select: { settings: true },
      });
      if (!business) throw new NotFoundError('Business', request.params.id);

      const settings = (business.settings as Record<string, unknown>) ?? {};
      const reviewSettings = {
        ...DEFAULT_REVIEW_SETTINGS,
        ...(settings['reviewSolicitation'] as Partial<ReviewSettings> | undefined),
      };

      return { success: true, settings: reviewSettings };
    },
  );

  /**
   * PATCH /businesses/:id/review-settings
   */
  app.patch<{ Params: { id: string } }>(
    '/businesses/:id/review-settings',
    async (request, _reply) => {
      const business = await db.business.findUnique({
        where: { id: request.params.id },
        select: { settings: true },
      });
      if (!business) throw new NotFoundError('Business', request.params.id);

      const body = request.body as Partial<ReviewSettings>;
      const existingSettings = (business.settings as Record<string, unknown>) ?? {};
      const existingReview = (existingSettings['reviewSolicitation'] as Partial<ReviewSettings> | undefined) ?? {};

      const merged: ReviewSettings = {
        ...DEFAULT_REVIEW_SETTINGS,
        ...existingReview,
        ...body,
      };

      const updated = await db.business.update({
        where: { id: request.params.id },
        data: {
          settings: {
            ...existingSettings,
            reviewSolicitation: merged,
          },
        },
        select: { settings: true },
      });

      const updatedSettings = (updated.settings as Record<string, unknown>)['reviewSolicitation'] as ReviewSettings;
      log.info({ businessId: request.params.id }, 'Review solicitation settings updated');
      return { success: true, settings: updatedSettings };
    },
  );

  /**
   * POST /businesses/:id/review-solicitation/process
   */
  app.post<{ Params: { id: string } }>(
    '/businesses/:id/review-solicitation/process',
    async (request, reply) => {
      const { feedbackId } = request.body as { feedbackId?: string };
      if (!feedbackId) return reply.code(400).send({ success: false, error: 'feedbackId is required' });

      const business = await db.business.findUnique({
        where: { id: request.params.id },
        select: { id: true, name: true, settings: true },
      });
      if (!business) throw new NotFoundError('Business', request.params.id);

      const settings = (business.settings as Record<string, unknown>) ?? {};
      const reviewSettings: ReviewSettings = {
        ...DEFAULT_REVIEW_SETTINGS,
        ...(settings['reviewSolicitation'] as Partial<ReviewSettings> | undefined),
      };

      if (!reviewSettings.enabled) {
        return { success: true, action: 'none', reason: 'Review solicitation is disabled' };
      }

      const feedback = await db.feedbackEntry.findUnique({
        where: { id: feedbackId },
      });
      if (!feedback) throw new NotFoundError('FeedbackEntry', feedbackId);
      if (feedback.businessId !== request.params.id) {
        return reply.code(403).send({ success: false, error: 'Feedback does not belong to this business' });
      }

      if (!feedback.rating) {
        return { success: true, action: 'none', reason: 'Feedback has no rating' };
      }

      // Need a contactId to create an activity record
      if (!feedback.contactId) {
        return { success: true, action: 'none', reason: 'No contact linked to feedback' };
      }

      // Good feedback → review request
      if (meetsThreshold(feedback.rating, reviewSettings.goodThreshold)) {
        const message = reviewSettings.goodMessage
          .replace('{reviewUrl}', reviewSettings.googleReviewUrl)
          .replace('{businessName}', business.name);

        await db.contactActivity.create({
          data: {
            businessId: business.id,
            contactId: feedback.contactId,
            type: 'REVIEW_REQUEST_SENT',
            title: 'Google Review request sent',
            description: message,
            metadata: {
              feedbackId: feedback.id,
              feedbackRating: feedback.rating,
              googleReviewUrl: reviewSettings.googleReviewUrl,
            },
          },
        });

        log.info(
          { businessId: business.id, feedbackId, rating: feedback.rating },
          'Review request recorded for positive feedback',
        );

        return { success: true, action: 'review_request' };
      }

      // Bad feedback → apology + owner alert
      if (isBadRating(feedback.rating)) {
        const message = reviewSettings.badMessage
          .replace('{businessName}', business.name);

        await db.contactActivity.create({
          data: {
            businessId: business.id,
            contactId: feedback.contactId,
            type: 'BAD_FEEDBACK_ALERT',
            title: 'Bad feedback alert — apology queued',
            description: message,
            metadata: {
              feedbackId: feedback.id,
              feedbackRating: feedback.rating,
              customerPhone: feedback.customerPhone,
              comment: feedback.comment,
            },
          },
        });

        log.info(
          { businessId: business.id, feedbackId, rating: feedback.rating },
          'Bad feedback alert recorded',
        );

        return { success: true, action: 'apology' };
      }

      // Neutral (OKAY) — no action
      return { success: true, action: 'none', reason: 'Rating does not trigger any action' };
    },
  );

  /**
   * GET /businesses/:id/review-solicitation/stats
   */
  app.get<{ Params: { id: string } }>(
    '/businesses/:id/review-solicitation/stats',
    async (request, _reply) => {
      const { id: businessId } = request.params;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [reviewRequestsSent, badFeedbackAlerts] = await Promise.all([
        db.contactActivity.count({
          where: {
            businessId,
            type: 'REVIEW_REQUEST_SENT',
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        db.contactActivity.count({
          where: {
            businessId,
            type: 'BAD_FEEDBACK_ALERT',
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
      ]);

      return {
        success: true,
        stats: { reviewRequestsSent, badFeedbackAlerts, period: '30d' },
      };
    },
  );
}
