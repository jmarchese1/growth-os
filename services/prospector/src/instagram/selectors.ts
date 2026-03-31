/**
 * Instagram UI selectors — configurable to survive DOM changes.
 * Defaults are overridden by InstagramSession.selectors JSON from DB.
 */

export interface InstagramSelectors {
  // Profile page
  messageButton: string;       // "Message" button on a profile
  privateIndicator: string;    // Element indicating private account

  // DM thread
  textArea: string;            // Message input field
  sendButton: string;          // Send button (or null if Enter key is used)

  // Session validation
  loginIndicator: string;      // Element present when logged in
  challengeIndicator: string;  // Element present when challenge/checkpoint shown
  notFoundIndicator: string;   // Element present when profile doesn't exist
}

export const DEFAULT_SELECTORS: InstagramSelectors = {
  // Profile page — Instagram uses aria-labels and role attributes
  messageButton: '[role="button"]:has-text("Message"), a[href*="/direct/t/"]',
  privateIndicator: 'h2:has-text("This account is private")',

  // DM thread — the text input in the DM conversation
  textArea: '[aria-label="Message"], [placeholder="Message..."], div[contenteditable="true"][role="textbox"]',
  sendButton: 'button:has-text("Send"), [aria-label="Send"]',

  // Session validation
  loginIndicator: '[aria-label="Home"], svg[aria-label="Home"]',
  challengeIndicator: '#challenge, [data-testid="login-challenge"], form[action*="challenge"]',
  notFoundIndicator: 'h2:has-text("Sorry, this page"), span:has-text("isn\'t available")',
};

/**
 * Merge DB-stored selector overrides with defaults.
 * Only overrides fields that are explicitly set in the JSON.
 */
export function getSelectors(overrides?: Record<string, string> | null): InstagramSelectors {
  if (!overrides) return DEFAULT_SELECTORS;
  return { ...DEFAULT_SELECTORS, ...overrides };
}
