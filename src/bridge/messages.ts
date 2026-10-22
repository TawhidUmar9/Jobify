import { err, ok, type Result } from '../lib/result';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseOptions(value: unknown): SelectOption[] | null {
  if (!Array.isArray(value)) return null;
  const options: SelectOption[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.value !== 'string' || typeof item.text !== 'string') return null;
    options.push({ value: item.value, text: item.text });
  }
  return options;
}

function parseInput(value: unknown): ScrapedInput | null {
  if (!isRecord(value)) return null;
  const tag = value.tag;
  if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') return null;
  if (
    typeof value.clawId !== 'string' ||
    typeof value.type !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.id !== 'string' ||
    typeof value.placeholder !== 'string' ||
    typeof value.ariaLabel !== 'string' ||
    typeof value.label !== 'string'
  ) {
    return null;
  }
  const input: ScrapedInput = {
    clawId: value.clawId,
    tag,
    type: value.type,
    name: value.name,
    id: value.id,
    placeholder: value.placeholder,
    ariaLabel: value.ariaLabel,
    label: value.label,
  };
  if (value.options !== undefined) {
    if (tag !== 'select') return null;
    const options = parseOptions(value.options);
    if (!options) return null;
    input.options = options;
  }
  return input;
}

function parsePage(value: Record<string, unknown>): Result<PageScrapedMessage, BridgeParseError> {
  if (typeof value.url !== 'string' || typeof value.title !== 'string' || typeof value.pageText !== 'string' || !Array.isArray(value.inputs)) {
    return err('INVALID_SHAPE');
  }
  const inputs: ScrapedInput[] = [];
  for (const item of value.inputs.slice(0, SCRAPE_LIMITS.maxInputs)) {
    const input = parseInput(item);
    if (!input) return err('INVALID_SHAPE');
    inputs.push(input);
  }
  return ok({
    type: 'PAGE_SCRAPED',
    url: value.url,
    title: value.title,
    pageText: value.pageText.slice(0, SCRAPE_LIMITS.pageTextMaxChars),
    inputs,
  });
}

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
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return err('INVALID_JSON');
  }
  if (!isRecord(parsed) || typeof parsed.type !== 'string') return err('UNKNOWN_TYPE');
  if (parsed.type === 'PAGE_SCRAPED') return parsePage(parsed);
  if (parsed.type === 'SCRAPE_ERROR') {
    if (typeof parsed.error !== 'string') return err('INVALID_SHAPE');
    return ok({ type: 'SCRAPE_ERROR', error: parsed.error });
  }
  if (parsed.type === 'AUTOFILL_COMPLETE') {
    if (typeof parsed.filledCount !== 'number' || !isStringArray(parsed.missingClawIds)) return err('INVALID_SHAPE');
    return ok({ type: 'AUTOFILL_COMPLETE', filledCount: parsed.filledCount, missingClawIds: parsed.missingClawIds });
  }
  if (parsed.type === 'AUTOFILL_ERROR') {
    if (typeof parsed.error !== 'string') return err('INVALID_SHAPE');
    return ok({ type: 'AUTOFILL_ERROR', error: parsed.error });
  }
  return err('UNKNOWN_TYPE');
}
