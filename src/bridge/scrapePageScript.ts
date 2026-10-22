/**
 * JavaScript string injected with webViewRef.injectJavaScript(SCRAPE_PAGE_JS)
 * when the user taps Analyze. Runs in the page's main frame only.
 *
 * Exact behaviour (see TASKS.md T-022 for the reference implementation):
 * 1. pageText = document.body.innerText, whitespace collapsed to single spaces,
 *    trimmed, sliced to SCRAPE_LIMITS.pageTextMaxChars (12000).
 * 2. Candidates = document.querySelectorAll('input, textarea, select') filtered to:
 *    - computed display !== 'none' and visibility !== 'hidden'
 *    - not el.disabled and not el.readOnly
 *    - for <input>: type not in EXCLUDED_INPUT_TYPES
 *    Keep at most SCRAPE_LIMITS.maxInputs (80), in document order.
 * 3. For each kept element at index i: set attribute data-jobify-id="jobify-field-<i>"
 *    (overwriting any previous value) and report a ScrapedInput:
 *    label from label[for=id], else closest('label'), else aria-labelledby target text;
 *    whitespace-collapsed, max 120 chars. For <select>, include options
 *    (max 50, text max 80 chars).
 * 4. Post exactly one message: PAGE_SCRAPED {url, title, pageText, inputs}
 *    or SCRAPE_ERROR {error: String(err && err.message)} on any exception.
 * 5. The script must end with `true;` (required by react-native-webview on iOS).
 */
// TODO(T-022): replace this placeholder with the full script.
export const SCRAPE_PAGE_JS = `
(function() {
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SCRAPE_ERROR', error: 'NOT_IMPLEMENTED' }));
})();
true;
`;
