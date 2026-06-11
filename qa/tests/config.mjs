export const BASE = process.env.AURA_BASE || 'https://aifluencyprocenter.replit.app';
export const EMAIL = process.env.AURA_EMAIL || '';
export const PASSWORD = process.env.AURA_PASSWORD || '';

// Context options shared by every test. ignoreHTTPSErrors is required when the
// run happens behind a TLS-intercepting proxy (e.g. CI sandboxes).
export const CTX = {
  ignoreHTTPSErrors: true,
  viewport: { width: 1366, height: 900 },
};

// Console noise that is third-party / environmental, not an app defect.
export function isAppError(text) {
  return !text.includes('feedback-widget') &&
         !text.includes('SSL certificate error occurred when fetching');
}
