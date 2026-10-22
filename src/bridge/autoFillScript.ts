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
  const payload = JSON.stringify(fieldMappings.map((m) => ({ clawId: m.clawId, value: m.value })));
  return `
(function () {
  try {
    var mappings = ${payload};
    var filledCount = 0;
    var missingClawIds = [];
    var setNative = function (el, proto, value) {
      var d = Object.getOwnPropertyDescriptor(proto, 'value');
      if (d && d.set) { d.set.call(el, value); } else { el.value = value; }
    };
    var fire = function (el, names) {
      names.forEach(function (n) { el.dispatchEvent(new Event(n, { bubbles: true })); });
    };
    mappings.forEach(function (m) {
      if (!m || typeof m.value !== 'string' || m.value === '') return;
      try {
        var el = document.querySelector('[data-jobify-id="' + m.clawId + '"]');
        if (!el) { missingClawIds.push(m.clawId); return; }
        if (el.tagName === 'SELECT') {
          var match = null;
          var want = m.value.trim().toLowerCase();
          for (var i = 0; i < el.options.length && match === null; i++) {
            if (el.options[i].value === m.value) match = el.options[i].value;
          }
          for (var j = 0; j < el.options.length && match === null; j++) {
            if (el.options[j].text.trim().toLowerCase() === want) match = el.options[j].value;
          }
          if (match === null) { missingClawIds.push(m.clawId); return; }
          setNative(el, window.HTMLSelectElement.prototype, match);
          fire(el, ['input', 'change']);
        } else {
          if (typeof el.focus === 'function') el.focus();
          var proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
          setNative(el, proto, m.value);
          fire(el, ['input', 'change', 'blur']);
        }
        el.style.outline = '2px solid #10b981';
        filledCount++;
      } catch (e) {
        missingClawIds.push(m.clawId);
      }
    });
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'AUTOFILL_COMPLETE', filledCount: filledCount, missingClawIds: missingClawIds
    }));
  } catch (err) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTOFILL_ERROR', error: String(err && err.message) }));
  }
})();
true;
`;
}
