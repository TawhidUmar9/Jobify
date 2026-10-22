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
export const SCRAPE_PAGE_JS = String.raw`
(function () {
  try {
    var EXCLUDED = ['hidden','file','submit','button','image','reset','checkbox','radio','password'];
    var clean = function (s, max) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, max); };
    var prev = document.querySelectorAll('[data-jobify-id]');
    for (var p = 0; p < prev.length; p++) prev[p].removeAttribute('data-jobify-id');
    var pageText = document.body ? clean(document.body.innerText, 12000) : '';
    var all = document.querySelectorAll('input, textarea, select');
    var kept = [];
    for (var i = 0; i < all.length && kept.length < 80; i++) {
      var el = all[i];
      var tag = el.tagName.toLowerCase();
      var type = tag === 'input' ? String(el.getAttribute('type') || 'text').toLowerCase()
               : (tag === 'select' ? 'select-one' : 'textarea');
      if (tag === 'input' && EXCLUDED.indexOf(type) !== -1) continue;
      if (el.disabled || el.readOnly) continue;
      var style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      kept.push({ el: el, tag: tag, type: type });
    }
    var inputs = kept.map(function (k, index) {
      var el = k.el;
      var clawId = 'jobify-field-' + index;
      el.setAttribute('data-jobify-id', clawId);
      var label = '';
      if (el.labels && el.labels.length) label = el.labels[0].innerText;
      if (!label) {
        var ids = el.getAttribute('aria-labelledby');
        if (ids) label = ids.split(/\s+/).map(function (id) {
          var n = document.getElementById(id); return n ? n.innerText : '';
        }).join(' ');
      }
      var item = {
        clawId: clawId, tag: k.tag, type: k.type,
        name: el.getAttribute('name') || '', id: el.id || '',
        placeholder: el.getAttribute('placeholder') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        label: clean(label, 120)
      };
      if (k.tag === 'select') {
        item.options = Array.prototype.slice.call(el.options, 0, 50).map(function (o) {
          return { value: String(o.value), text: clean(o.text, 80) };
        });
      }
      return item;
    });
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'PAGE_SCRAPED', url: window.location.href, title: document.title,
      pageText: pageText, inputs: inputs
    }));
  } catch (err) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'SCRAPE_ERROR', error: String(err && err.message)
    }));
  }
})();
true;
`;
