import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { createLogger } from '@embedo/utils';
import { db } from '@embedo/db';


const log = createLogger('api:billing');


function getStripe(): Stripe | null {
  const key = process.env['STRIPE_SECRET_KEY'];
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2026-02-25.clover' });
}

interface TierConfig {
  priceEnv: string;
  name: string;
  description: string;
  features: string[];
}

const TIER_CONFIG: Record<string, TierConfig> = {
  SOLO: {
    priceEnv: 'STRIPE_PRICE_SOLO',
    name: 'Embedo Solo',
    description: 'AI-powered tools for solo business operators',
    features: [
      '500 contacts',
      'AI Voice Agent + dedicated phone number',
      'Custom AI website',
      '10 QR codes, 5 surveys',
      '100 emails/mo, 50 AI images/mo',
    ],
  },
  SMALL: {
    priceEnv: 'STRIPE_PRICE_SMALL',
    name: 'Embedo Small',
    description: 'Everything a small team needs to grow',
    features: [
      '2,000 contacts, 3 chatbot widgets',
      'Social media automation (30 posts/mo)',
      'Email sequences & 1,000 emails/mo',
      'Unlimited surveys',
      '200 AI images/mo',
    ],
  },
  MEDIUM: {
    priceEnv: 'STRIPE_PRICE_MEDIUM',
    name: 'Embedo Medium',
    description: 'Advanced tools for growing businesses',
    features: [
      '10,000 contacts, 10 chatbot widgets',
      '3 phone numbers, 100 social posts/mo',
      'Unlimited email sequences',
      '10,000 emails/mo, 500 AI images/mo',
      'Priority support',
    ],
  },
  LARGE: {
    priceEnv: 'STRIPE_PRICE_LARGE',
    name: 'Embedo Large',
    description: 'Enterprise-grade with unlimited everything',
    features: [
      'Unlimited contacts, widgets & phone numbers',
      'Unlimited emails, images & social posts',
      'White-label branding',
      'Dedicated account manager',
      'SLA guarantee',
    ],
  },
};

function getPriceId(tier: string): string | null {
  const config = TIER_CONFIG[tier];
  if (!config) return null;
  return process.env[config.priceEnv] ?? null;
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

  // ─── Public checkout — no auth needed, for landing page ──────────────────
  app.post('/billing/public-checkout', async (request, reply) => {
    const { tier, successUrl, cancelUrl } = request.body as {
      tier: string;
      successUrl?: string;
      cancelUrl?: string;
    };

    if (!tier) {
      return reply.code(400).send({ error: 'tier required' });
    }

    const stripe = getStripe();
    if (!stripe) {
      return reply.code(503).send({ error: 'Stripe not configured' });
    }

    const priceId = getPriceId(tier.toUpperCase());
    if (!priceId) {
      return reply.code(400).send({ error: `No Stripe price configured for tier: ${tier}` });
    }

    const tierConfig = TIER_CONFIG[tier.toUpperCase()];
    const featuresText = tierConfig
      ? tierConfig.features.join(' · ')
      : undefined;

    // Append session_id template to success URL so the client can claim the session later
    const baseSuccessUrl = successUrl ?? 'https://app.embedo.io/login?checkout=success';
    const separator = baseSuccessUrl.includes('?') ? '&' : '?';
    const finalSuccessUrl = `${baseSuccessUrl}${separator}session_id={CHECKOUT_SESSION_ID}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: finalSuccessUrl,
      cancel_url: cancelUrl ?? 'https://embedo.io',
      subscription_data: {
        trial_period_days: 14,
        metadata: { tier: tier.toUpperCase() },
        ...(featuresText ? { description: featuresText } : {}),
      },
      custom_text: {
        submit: {
          message: 'Your 14-day free trial starts now. You won\'t be charged until the trial ends, and you can cancel anytime.',
        },
      },
      customer_creation: 'always',
      consent_collection: { terms_of_service: 'none' },
      tax_id_collection: { enabled: true },
      metadata: { tier: tier.toUpperCase(), source: 'landing_page' },
    });

    log.info({ tier, sessionId: session.id }, 'Public checkout session created');
    return reply.code(200).send({ url: session.url, sessionId: session.id });
  });

  // ─── Claim a public checkout session after account creation ────────────────
  app.post('/billing/claim-session', async (request, reply) => {
    const { sessionId, businessId } = request.body as {
      sessionId: string;
      businessId: string;
    };

    if (!sessionId || !businessId) {
      return reply.code(400).send({ error: 'sessionId and businessId required' });
    }

    const stripe = getStripe();
    if (!stripe) {
      return reply.code(503).send({ error: 'Stripe not configured' });
    }

    // Verify the business exists
    const business = await db.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return reply.code(404).send({ error: 'Business not found' });
    }

    // Check if business already has a subscription
    const existing = await db.subscription.findUnique({ where: { businessId } });
    if (existing && (existing.status === 'ACTIVE' || existing.status === 'TRIALING')) {
      return reply.code(200).send({ success: true, subscription: existing, message: 'Already has subscription' });
    }

    try {
      // Retrieve the checkout session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.status !== 'complete') {
        return reply.code(400).send({ error: 'Checkout session not completed' });
      }

      const stripeSubId = typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as { id: string } | null)?.id;

      if (!stripeSubId) {
        return reply.code(400).send({ error: 'No subscription in checkout session' });
      }

      // Link Stripe customer to business
      const stripeCustomerId = typeof session.customer === 'string'
        ? session.customer
        : (session.customer as { id: string } | null)?.id;

      if (stripeCustomerId && !business.stripeCustomerId) {
        await db.business.update({
          where: { id: businessId },
          data: { stripeCustomerId },
        });
      }

      // Fetch full subscription details
      const sub = await stripe.subscriptions.retrieve(stripeSubId);
      const tier = session.metadata?.['tier'] ?? 'SOLO';

      // Update subscription metadata with the businessId for future webhook events
      await stripe.subscriptions.update(stripeSubId, {
        metadata: { ...sub.metadata, businessId },
      });

      const subscription = await db.subscription.upsert({
        where: { businessId },
        create: {
          businessId,
          stripeSubscriptionId: stripeSubId,
          pricingTier: (['FREE', 'SOLO', 'SMALL', 'MEDIUM', 'LARGE'].includes(tier.toUpperCase()) ? tier.toUpperCase() : 'SOLO') as 'FREE' | 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE',
          status: sub.status === 'trialing' ? 'TRIALING' : 'ACTIVE',
          currentPeriodStart: new Date(sub.start_date * 1000),
          currentPeriodEnd: new Date(sub.billing_cycle_anchor * 1000),
          trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        },
        update: {
          stripeSubscriptionId: stripeSubId,
          pricingTier: (['FREE', 'SOLO', 'SMALL', 'MEDIUM', 'LARGE'].includes(tier.toUpperCase()) ? tier.toUpperCase() : 'SOLO') as 'FREE' | 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE',
          status: sub.status === 'trialing' ? 'TRIALING' : 'ACTIVE',
          currentPeriodStart: new Date(sub.start_date * 1000),
          currentPeriodEnd: new Date(sub.billing_cycle_anchor * 1000),
          trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        },
      });

      log.info({ businessId, tier, stripeSubId, sessionId }, 'Public checkout session claimed');
      return reply.code(200).send({ success: true, subscription });
    } catch (err) {
      log.error({ err, sessionId, businessId }, 'Failed to claim checkout session');
      return reply.code(500).send({ error: 'Failed to claim checkout session' });
    }
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

    const tierConfig = TIER_CONFIG[tier.toUpperCase()];
    const featuresText = tierConfig
      ? tierConfig.features.join(' · ')
      : undefined;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: 14,
        metadata: { businessId, tier: tier.toUpperCase() },
        ...(featuresText ? { description: featuresText } : {}),
      },
      custom_text: {
        submit: {
          message: 'Your 14-day free trial starts now. You won\'t be charged until the trial ends, and you can cancel anytime.',
        },
      },
      consent_collection: {
        terms_of_service: 'none',
      },
      customer_update: { name: 'auto', address: 'auto' },
      tax_id_collection: { enabled: true },
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

  // ─── Admin: grant a plan without Stripe (testing only) ───────────────────
  app.post('/billing/grant', async (request, reply) => {
    const { email, tier } = request.body as { email?: string; businessId?: string; tier?: string };
    const pricingTier = (tier ?? 'LARGE').toUpperCase();

    const validTiers = ['FREE', 'SOLO', 'SMALL', 'MEDIUM', 'LARGE'];
    if (!validTiers.includes(pricingTier)) {
      return reply.code(400).send({ error: `Invalid tier. Valid: ${validTiers.join(', ')}` });
    }

    let businessId = (request.body as Record<string, string>)['businessId'];

    if (!businessId && email) {
      // Try user email first, then business email
      const user = await db.user.findUnique({ where: { email }, select: { businessId: true } });
      if (user?.businessId) {
        businessId = user.businessId;
      } else {
        const biz = await db.business.findFirst({ where: { email }, select: { id: true } });
        if (biz) businessId = biz.id;
      }
    }

    if (!businessId) {
      return reply.code(404).send({ error: 'No business found for that email or businessId' });
    }

    const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const sub = await db.subscription.upsert({
      where: { businessId },
      update: {
        pricingTier: pricingTier as 'FREE' | 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: oneYear,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
      create: {
        businessId,
        pricingTier: pricingTier as 'FREE' | 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: oneYear,
      },
    });

    log.info({ businessId, tier: pricingTier }, 'Plan granted (admin bypass)');
    return reply.code(200).send({ success: true, subscription: sub });
  });
}
