import type { Result } from '../lib/result';

/**
 * WebView ⇄ React Native bridge protocol. CONTRACT FILE.
 * Pages send these via window.ReactNativeWebView.postMessage(JSON.stringify(msg)).
 * Any page can post messages, so parseBridgeMessage must validate strictly and
 * the workspace reducer ignores messages it is not waiting for.
 */

/** Limits enforced by SCRAPE_PAGE_JS. Tests assert scripts respect them. */
export const SCRAPE_LIMITS = {
  pageTextMaxChars: 12000,
  maxInputs: 80,
  labelMaxChars: 120,
  maxSelectOptions: 50,
  optionTextMaxChars: 80,
  /** Pages with fewer visible characters than this yield NO_CONTENT. */
  minPageTextChars: 200,
} as const;

/** Prefix of the tracking attribute value. Attribute name is `data-jobify-id`. */
export const CLAW_ID_PREFIX = 'jobify-field-';
export const CLAW_ID_ATTRIBUTE = 'data-jobify-id';

/** input types the scraper never reports (and auto-fill never touches). */
export const EXCLUDED_INPUT_TYPES = [
  'hidden',
  'file',
  'submit',
  'button',
  'image',
  'reset',
  'checkbox',
  'radio',
  'password',
] as const;

export interface SelectOption {
  value: string;
  text: string;
}

export interface ScrapedInput {
  /** `jobify-field-<index>`; index is position in the filtered list, starting at 0. */
  clawId: string;
  tag: 'input' | 'textarea' | 'select';
  /** Lower-case input type; "text" when absent; "select-one" / "textarea" for those tags. */
  type: string;
  name: string;
  id: string;
  placeholder: string;
  ariaLabel: string;
  /** Associated <label> text, whitespace-collapsed, max 120 chars. */
  label: string;
  /** Present only when tag === 'select'. */
  options?: SelectOption[];
}

export interface PageScrapedMessage {
  type: 'PAGE_SCRAPED';
  url: string;
  title: string;
  pageText: string;
  inputs: ScrapedInput[];
}

export interface ScrapeErrorMessage {
  type: 'SCRAPE_ERROR';
  error: string;
}

export interface AutofillCompleteMessage {
  type: 'AUTOFILL_COMPLETE';
  filledCount: number;
  /** clawIds that were in the mapping but not found or failed to set. */
  missingClawIds: string[];
}

export interface AutofillErrorMessage {
  type: 'AUTOFILL_ERROR';
  error: string;
}

export type BridgeMessage =
  | PageScrapedMessage
  | ScrapeErrorMessage
  | AutofillCompleteMessage
  | AutofillErrorMessage;

export type BridgeParseError = 'INVALID_JSON' | 'UNKNOWN_TYPE' | 'INVALID_SHAPE';

/**
 * Parses WebViewMessageEvent.nativeEvent.data into a BridgeMessage.
 *
 * Rules:
 * - Non-JSON → err('INVALID_JSON').
 * - JSON without a known `type` → err('UNKNOWN_TYPE').
 * - Known type with wrong field types → err('INVALID_SHAPE'). Field types are exactly
 *   those in the interfaces above; `options` must be an array when present.
 * - PAGE_SCRAPED: truncate pageText to SCRAPE_LIMITS.pageTextMaxChars and inputs to
 *   SCRAPE_LIMITS.maxInputs even if the page sent more (defence against hostile pages).
 * - Never throws.
 */
export function parseBridgeMessage(raw: string): Result<BridgeMessage, BridgeParseError> {
  // TODO(T-021): implement per the rules above.
  void raw;
  return { ok: false, error: 'UNKNOWN_TYPE' };
}
