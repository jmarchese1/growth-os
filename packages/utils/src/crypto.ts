import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify a webhook signature using HMAC-SHA256.
 * Used for ElevenLabs, Calendly, Twilio, and other webhook providers.
 */
export function verifyWebhookSignature(params: {
  payload: string | Buffer;
  signature: string;
  secret: string;
  algorithm?: string;
}): boolean {
  const { payload, signature, secret, algorithm = 'sha256' } = params;
  const hmac = createHmac(algorithm, secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(signature.replace(/^sha256=/, ''), 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  } catch {
    return false;
  }
}

/**
 * Generate a secure random token for share links, API keys, etc.
 */
export function generateToken(length = 32): string {
  const { randomBytes } = require('crypto') as typeof import('crypto');
  return randomBytes(length).toString('hex');
}
