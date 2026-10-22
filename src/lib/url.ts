/** URL helpers used by the WebView layer, share intent, and settings validation. */

/** True only for absolute URLs whose scheme is http: or https:. Never throws. */
export function isHttpUrl(value: string | null | undefined): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Turns address-bar input into a URL: trims; if it has no scheme and contains a dot and no spaces,
 * prefixes "https://"; returns the result if isHttpUrl, else null.
 * "wellfound.com/jobs" → "https://wellfound.com/jobs"; "hello world" → null.
 */
export function normalizeAddressInput(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const candidate =
    !hasScheme && trimmed.includes('.') && !/\s/.test(trimmed) ? `https://${trimmed}` : trimmed;
  return isHttpUrl(candidate) ? candidate : null;
}

/**
 * First http(s) URL inside shared text (e.g. "Check this job https://x.y/z via LinkedIn"),
 * with trailing punctuation `.,;:!?)]}'"` stripped. null if none.
 */
const TRAILING_URL_PUNCTUATION = /[.,;:!?)'\"\]}]+$/;

export function extractFirstUrl(text: string | null | undefined): string | null {
  if (typeof text !== 'string' || text.length === 0) return null;
  const match = /https?:\/\/\S+/i.exec(text);
  if (!match) return null;
  const stripped = match[0].replace(TRAILING_URL_PUNCTUATION, '');
  return isHttpUrl(stripped) ? stripped : null;
}

/** Schemes that leave the app via Linking.openURL instead of loading in the WebView. */
export const EXTERNAL_SCHEMES = ['mailto:', 'tel:', 'sms:', 'intent:', 'market:', 'whatsapp:'] as const;

/** True if `url` starts with one of EXTERNAL_SCHEMES (case-insensitive). */
export function isExternalSchemeUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0) return false;
  const lower = url.trim().toLowerCase();
  return EXTERNAL_SCHEMES.some((scheme) => lower.startsWith(scheme));
}

/** Hostname for display ("wellfound.com"), leading "www." stripped; non-URLs returned unchanged. */
export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}
