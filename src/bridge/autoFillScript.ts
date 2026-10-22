import type { FieldMapping } from '../types/domain';

/**
 * Builds the JavaScript string that writes values into the page's form fields
 * in a way React/Vue controlled inputs accept.
 *
 * Exact behaviour (reference implementation in TASKS.md T-032):
 * - Embed mappings with JSON.stringify (never string concatenation of values).
 * - For each mapping with a non-empty value, find
 *   document.querySelector('[data-jobify-id="<clawId>"]').
 *   - Not found → add clawId to missingClawIds.
 *   - INPUT/TEXTAREA: call the native `value` setter from HTMLInputElement.prototype or
 *     HTMLTextAreaElement.prototype, then dispatch bubbling 'input', 'change', 'blur'.
 *   - SELECT: pick the option whose value === mapping.value, else whose trimmed text
 *     equals mapping.value case-insensitively; if none, add to missingClawIds; else
 *     use the HTMLSelectElement.prototype value setter and dispatch 'input' + 'change'.
 *   - Wrap each field in try/catch; a throw adds the clawId to missingClawIds.
 *   - On success set el.style.outline = '2px solid #10b981' and increment filledCount.
 * - Post AUTOFILL_COMPLETE {filledCount, missingClawIds}; on an outer exception post
 *   AUTOFILL_ERROR {error}.
 * - End with `true;`.
 */
export function buildAutoFillScript(fieldMappings: FieldMapping[]): string {
  // TODO(T-032): implement per the rules above.
  void fieldMappings;
  return `
(function() {
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTOFILL_ERROR', error: 'NOT_IMPLEMENTED' }));
})();
true;
`;
}
