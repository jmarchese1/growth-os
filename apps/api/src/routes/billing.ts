import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { createLogger } from '@embedo/utils';
import { db } from '@embedo/db';
import { env } from '../config.js';

const log = createLogger('api:billing');


function getStripe(): Stripe | null {
  const key = (env as Record<string, unknown>)['STRIPE_SECRET_KEY'] as string | undefined;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2026-02-25.clover' });
}

function getPriceId(tier: string): string | null {
  const e = env as Record<string, unknown>;
  const map: Record<string, string | undefined> = {
    SOLO: e['STRIPE_PRICE_SOLO'] as string | undefined,
    SMALL: e['STRIPE_PRICE_SMALL'] as string | undefined,
    MEDIUM: e['STRIPE_PRICE_MEDIUM'] as string | undefined,
    LARGE: e['STRIPE_PRICE_LARGE'] as string | undefined,
  };
  return map[tier] ?? null;
}

export async function billingRoutes(app: FastifyInstance): Promise<void> {

  // ─── Get subscription for a business ────────────────────────────────────
  app.get('/billing/subscription', async (request, reply) => {
    const { businessId } = request.query as { businessId: string };
    if (!businessId) return reply.code(400).send({ error: 'businessId required' });

    const subscription = await db.subscription.findUnique({
      where: { businessId },
    });

    if (!subscription) {
      return reply.code(200).send({ subscription: null });
    }

    return reply.code(200).send({ subscription });
  });

  // ─── Create checkout session (subscribe) ─────────────────────────────────
  app.post('/billing/checkout', async (request, reply) => {
    const { businessId, tier, successUrl, cancelUrl } = request.body as {
      businessId: string;
      tier: string;
      successUrl: string;
      cancelUrl: string;
    };

    if (!businessId || !tier) {
      return reply.code(400).send({ error: 'businessId and tier required' });
    }

    const stripe = getStripe();
    if (!stripe) {
      return reply.code(503).send({ error: 'Stripe not configured' });
    }

    const priceId = getPriceId(tier.toUpperCase());
    if (!priceId) {
      return reply.code(400).send({ error: `No Stripe price configured for tier: ${tier}` });
    }

    // Get or create Stripe customer
    const business = await db.business.findUnique({ where: { id: businessId } });
    if (!business) return reply.code(404).send({ error: 'Business not found' });

    let customerId = business.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: business.name,
        ...(business.email ? { email: business.email } : {}),
        metadata: { businessId: business.id },
      });
      customerId = customer.id;
      await db.business.update({
        where: { id: businessId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Check for existing active subscription
    const existing = await db.subscription.findUnique({ where: { businessId } });
    if (existing && (existing.status === 'ACTIVE' || existing.status === 'TRIALING')) {
      return reply.code(409).send({
        error: 'Business already has an active subscription',
        subscription: existing,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: 14,
        metadata: { businessId, tier: tier.toUpperCase() },
      },
      metadata: { businessId, tier: tier.toUpperCase() },
    });

    log.info({ businessId, tier, sessionId: session.id }, 'Checkout session created');
    return reply.code(200).send({ url: session.url, sessionId: session.id });
  });

  // ─── Create billing portal session ──────────────────────────────────────
  app.post('/billing/portal', async (request, reply) => {
    const { businessId, returnUrl } = request.body as { businessId: string; returnUrl: string };
    if (!businessId) return reply.code(400).send({ error: 'businessId required' });

    const stripe = getStripe();
    if (!stripe) return reply.code(503).send({ error: 'Stripe not configured' });

    const business = await db.business.findUnique({ where: { id: businessId } });
    if (!business?.stripeCustomerId) {
      return reply.code(400).send({ error: 'No Stripe customer linked to this business' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: business.stripeCustomerId,
      return_url: returnUrl,
    });

    return reply.code(200).send({ url: session.url });
  });

  // ─── Cancel subscription ────────────────────────────────────────────────
  app.post('/billing/cancel', async (request, reply) => {
    const { businessId } = request.body as { businessId: string };
    if (!businessId) return reply.code(400).send({ error: 'businessId required' });

    const stripe = getStripe();
    if (!stripe) return reply.code(503).send({ error: 'Stripe not configured' });

    const subscription = await db.subscription.findUnique({ where: { businessId } });
    if (!subscription?.stripeSubscriptionId) {
      return reply.code(404).send({ error: 'No active subscription' });
    }

    // Cancel at end of billing period (not immediate)
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await db.subscription.update({
      where: { businessId },
      data: { cancelAtPeriodEnd: true },
    });

    log.info({ businessId }, 'Subscription set to cancel at period end');
    return reply.code(200).send({ success: true, message: 'Subscription will cancel at end of billing period' });
  });

  // ─── Resume canceled subscription ───────────────────────────────────────
  app.post('/billing/resume', async (request, reply) => {
    const { businessId } = request.body as { businessId: string };
    if (!businessId) return reply.code(400).send({ error: 'businessId required' });

    const stripe = getStripe();
    if (!stripe) return reply.code(503).send({ error: 'Stripe not configured' });

    const subscription = await db.subscription.findUnique({ where: { businessId } });
    if (!subscription?.stripeSubscriptionId) {
      return reply.code(404).send({ error: 'No subscription found' });
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await db.subscription.update({
      where: { businessId },
      data: { cancelAtPeriodEnd: false },
    });

    log.info({ businessId }, 'Subscription resumed');
    return reply.code(200).send({ success: true });
  });
}
