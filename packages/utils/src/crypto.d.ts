/**
 * Verify a webhook signature using HMAC-SHA256.
 * Used for ElevenLabs, Calendly, Twilio, and other webhook providers.
 */
export declare function verifyWebhookSignature(params: {
    payload: string | Buffer;
    signature: string;
    secret: string;
    algorithm?: string;
}): boolean;
/**
 * Generate a secure random token for share links, API keys, etc.
 */
export declare function generateToken(length?: number): string;
//# sourceMappingURL=crypto.d.ts.map