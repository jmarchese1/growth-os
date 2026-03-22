import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { createLogger } from '@embedo/utils';
import { db } from '@embedo/db';


const log = createLogger('api:stripe-webhook');

function getStripe(): Stripe | null {
  const key = process.env['STRIPE_SECRET_KEY'];
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2026-02-25.clover' });
}

function tierFromMetadata(metadata: Record<string, string>): 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE' {
  const raw = (metadata['tier'] ?? 'SOLO').toUpperCase();
  if (['SOLO', 'SMALL', 'MEDIUM', 'LARGE'].includes(raw)) return raw as 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE';
  return 'SOLO';
}

function mapStatus(stripeStatus: string): 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PAUSED' {
  switch (stripeStatus) {
    case 'trialing': return 'TRIALING';
    case 'active': return 'ACTIVE';
    case 'past_due': return 'PAST_DUE';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired': return 'CANCELED';
    case 'paused': return 'PAUSED';
    default: return 'ACTIVE';
  }
}

export async function stripeWebhookRoutes(app: FastifyInstance): Promise<void> {
  // Need raw body for signature verification
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);
  });

  app.post('/webhooks/stripe', async (request, reply) => {
    const stripe = getStripe();
    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

    if (!stripe || !webhookSecret) {
      log.warn('Stripe not configured — ignoring webhook');
      return reply.code(200).send({ received: true });
    }

    const sig = request.headers['stripe-signature'] as string;
    if (!sig) {
      return reply.code(400).send({ error: 'Missing stripe-signature header' });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(request.body as Buffer, sig, webhookSecret);
    } catch (err) {
      log.warn({ err }, 'Stripe webhook signature verification failed');
      return reply.code(400).send({ error: 'Invalid signature' });
    }

    log.info({ type: event.type, id: event.id }, 'Stripe webhook received');

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const businessId = session.metadata?.['businessId'];
        const tier = session.metadata?.['tier'] ?? 'SOLO';

        if (!businessId) {
          log.warn({ sessionId: session.id }, 'Checkout session missing businessId metadata');
          break;
        }

        // Subscription ID from the checkout
        const stripeSubId = typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription as Stripe.Subscription | null)?.id;

        if (!stripeSubId) {
          log.warn({ sessionId: session.id }, 'Checkout session has no subscription');
          break;
        }

        // Fetch full subscription for period dates
        const sub = await stripe.subscriptions.retrieve(stripeSubId);

        await db.subscription.upsert({
          where: { businessId },
          create: {
            businessId,
            stripeSubscriptionId: stripeSubId,
            pricingTier: tierFromMetadata({ tier }),
            status: mapStatus(sub.status),
            currentPeriodStart: new Date(sub.start_date * 1000),
            currentPeriodEnd: new Date(sub.billing_cycle_anchor * 1000),
            trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          },
          update: {
            stripeSubscriptionId: stripeSubId,
            pricingTier: tierFromMetadata({ tier }),
            status: mapStatus(sub.status),
            currentPeriodStart: new Date(sub.start_date * 1000),
            currentPeriodEnd: new Date(sub.billing_cycle_anchor * 1000),
            trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          },
        });

        log.info({ businessId, tier, stripeSubId }, 'Subscription created from checkout');
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const businessId = sub.metadata?.['businessId'];

        if (!businessId) {
          // Try to find by stripeSubscriptionId
          const existing = await db.subscription.findUnique({
            where: { stripeSubscriptionId: sub.id },
          });
          if (!existing) {
            log.warn({ subId: sub.id }, 'Subscription update — no matching business found');
            break;
          }

          await db.subscription.update({
            where: { stripeSubscriptionId: sub.id },
            data: {
              status: mapStatus(sub.status),
              currentPeriodStart: new Date(sub.start_date * 1000),
              currentPeriodEnd: new Date(sub.billing_cycle_anchor * 1000),
              trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
            },
          });
        } else {
          await db.subscription.upsert({
            where: { businessId },
            create: {
              businessId,
              stripeSubscriptionId: sub.id,
              pricingTier: tierFromMetadata(sub.metadata as Record<string, string>),
              status: mapStatus(sub.status),
              currentPeriodStart: new Date(sub.start_date * 1000),
              currentPeriodEnd: new Date(sub.billing_cycle_anchor * 1000),
              trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
            },
            update: {
              status: mapStatus(sub.status),
              currentPeriodStart: new Date(sub.start_date * 1000),
              currentPeriodEnd: new Date(sub.billing_cycle_anchor * 1000),
              trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
            },
          });
        }

        log.info({ subId: sub.id, status: sub.status }, 'Subscription updated');
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;

        await db.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status: 'CANCELED',
            canceledAt: new Date(),
          },
        });

        log.info({ subId: sub.id }, 'Subscription canceled');
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetails = invoice.parent?.type === 'subscription_details'
          ? invoice.parent.subscription_details?.subscription
          : null;
        const subId = typeof subDetails === 'string' ? subDetails : (subDetails as Stripe.Subscription | null)?.id;

        if (subId) {
          await db.subscription.updateMany({
            where: { stripeSubscriptionId: subId },
            data: { status: 'PAST_DUE' },
          });
          log.warn({ subId, invoiceId: invoice.id }, 'Payment failed — subscription marked past_due');
        }
        break;
      }

      default:
        log.info({ type: event.type }, 'Unhandled Stripe event type');
    }

    return reply.code(200).send({ received: true });
  });
}
