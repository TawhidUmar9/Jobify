/** URL helpers used by the WebView layer, share intent, and settings validation. */

/** True only for absolute URLs whose scheme is http: or https:. Never throws. */
export function isHttpUrl(value: string | null | undefined): value is string {
  // TODO(T-024): implement with a try/catch around `new URL(value)`.
  void value;
  return false;
}

/**
 * Turns address-bar input into a URL: trims; if it has no scheme and contains a dot and no spaces,
 * prefixes "https://"; returns the result if isHttpUrl, else null.
 * "wellfound.com/jobs" → "https://wellfound.com/jobs"; "hello world" → null.
 */
export function normalizeAddressInput(input: string): string | null {
  // TODO(T-025): implement.
  void input;
  return null;
}

/**
 * First http(s) URL inside shared text (e.g. "Check this job https://x.y/z via LinkedIn"),
 * with trailing punctuation `.,;:!?)]}'"` stripped. null if none.
 */
export function extractFirstUrl(text: string | null | undefined): string | null {
  // TODO(T-025): implement.
  void text;
  return null;
}

/** Schemes that leave the app via Linking.openURL instead of loading in the WebView. */
export const EXTERNAL_SCHEMES = ['mailto:', 'tel:', 'sms:', 'intent:', 'market:', 'whatsapp:'] as const;

/** True if `url` starts with one of EXTERNAL_SCHEMES (case-insensitive). */
export function isExternalSchemeUrl(url: string): boolean {
  // TODO(T-046): implement.
  void url;
  return false;
}

/** Hostname for display ("wellfound.com"), leading "www." stripped; non-URLs returned unchanged. */
export function displayHost(url: string): string {
  // TODO(T-029): implement.
  return url;
}
