"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.generateToken = generateToken;
const crypto_1 = require("crypto");
/**
 * Verify a webhook signature using HMAC-SHA256.
 * Used for ElevenLabs, Calendly, Twilio, and other webhook providers.
 */
function verifyWebhookSignature(params) {
    const { payload, signature, secret, algorithm = 'sha256' } = params;
    const hmac = (0, crypto_1.createHmac)(algorithm, secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    try {
        return (0, crypto_1.timingSafeEqual)(Buffer.from(signature.replace(/^sha256=/, ''), 'hex'), Buffer.from(expectedSignature, 'hex'));
    }
    catch {
        return false;
    }
}
/**
 * Generate a secure random token for share links, API keys, etc.
 */
function generateToken(length = 32) {
    const { randomBytes } = require('crypto');
    return randomBytes(length).toString('hex');
}
//# sourceMappingURL=crypto.js.map