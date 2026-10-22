import { captureBridgeMessages, installInnerTextPolyfill, runInjectedScript } from '../../../tests/helpers/dom';
import type { FieldMapping } from '../../types/domain';
import { buildAutoFillScript } from '../autoFillScript';
import { parseBridgeMessage } from '../messages';
import { SCRAPE_PAGE_JS } from '../scrapePageScript';

const JOB_REMOTE_FORM_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Senior Backend Engineer - Acme Cloud</title>
</head>
<body>
<form id="apply" onsubmit="return false">
  <label for="full_name">Full name</label>
  <input id="full_name" name="full_name" type="text" data-controlled="name">

  <label for="email">Email</label>
  <input id="email" name="email" type="email" data-controlled="email">

  <input name="portfolio" type="url" aria-label="Portfolio URL" placeholder="https://" data-controlled="portfolio">

  <label>Why Acme Cloud?
    <textarea name="why" rows="4" data-controlled="why"></textarea>
  </label>

  <label for="years">Years of experience</label>
  <select id="years" name="years" data-controlled="years">
    <option value="">Choose…</option>
    <option value="0-2">0–2 years</option>
    <option value="3-5">3–5 years</option>
    <option value="6+">6+ years</option>
  </select>
</form>

<p id="state">state:</p>
<script id="inline-script">
  var state = {};
  function render() {
    var parts = Object.keys(state).sort().map(function (k) { return k + '=' + state[k]; });
    document.getElementById('state').textContent = 'state: ' + parts.join(' | ');
  }
  document.querySelectorAll('[data-controlled]').forEach(function (el) {
    var onEvent = function () { state[el.getAttribute('data-controlled')] = el.value; render(); };
    el.addEventListener('input', onEvent);
    el.addEventListener('change', onEvent);
  });
</script>
</body>
</html>`;

function setupDom(): void {
  document.open();
  document.write(JOB_REMOTE_FORM_HTML);
  document.close();
  installInnerTextPolyfill();

  const scriptEl = document.getElementById('inline-script');
  if (scriptEl?.textContent) {
    runInjectedScript(scriptEl.textContent);
  }
}

describe('buildAutoFillScript', () => {
  it('ends with true;', () => {
    expect(buildAutoFillScript([]).trim().endsWith('true;')).toBe(true);
  });

  it('fills remote form fixture with 5 validated mappings and updates #state', () => {
    setupDom();
    const captured = captureBridgeMessages();
    runInjectedScript(SCRAPE_PAGE_JS);

    const mappings: FieldMapping[] = [
      { clawId: 'jobify-field-0', fieldLabel: 'Full name', value: 'Alex Rahman', source: 'PROFILE' },
      { clawId: 'jobify-field-1', fieldLabel: 'Email', value: 'alex.rahman@example.com', source: 'PROFILE' },
      { clawId: 'jobify-field-2', fieldLabel: 'Portfolio URL', value: 'https://alex.example.com', source: 'PROFILE' },
      { clawId: 'jobify-field-3', fieldLabel: 'Why Acme Cloud?', value: 'I want to own backend and platform work end to end.', source: 'GENERATED' },
      { clawId: 'jobify-field-4', fieldLabel: 'Years of experience', value: '3-5', source: 'PROFILE' },
    ];

    const script = buildAutoFillScript(mappings);
    runInjectedScript(script);

    const message = captured.messages[captured.messages.length - 1];
    const parsed = parseBridgeMessage(JSON.stringify(message));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.value.type !== 'AUTOFILL_COMPLETE') {
      throw new Error('Expected AUTOFILL_COMPLETE');
    }
    expect(parsed.value.filledCount).toBe(5);
    expect(parsed.value.missingClawIds).toEqual([]);

    const stateText = document.getElementById('state')?.textContent ?? '';
    expect(stateText).toContain('name=Alex Rahman');
    expect(stateText).toContain('email=alex.rahman@example.com');
    expect(stateText).toContain('years=3-5');

    const nameInput = document.querySelector('[data-jobify-id="jobify-field-0"]') as HTMLElement;
    expect(nameInput.style.outline).toBe('2px solid #10b981');

    captured.restore();
  });

  it('reports unknown clawId as missing', () => {
    setupDom();
    const captured = captureBridgeMessages();
    runInjectedScript(SCRAPE_PAGE_JS);

    const mappings: FieldMapping[] = [
      { clawId: 'jobify-field-999', fieldLabel: 'Unknown', value: 'test', source: 'PROFILE' },
    ];

    runInjectedScript(buildAutoFillScript(mappings));

    const message = captured.messages[captured.messages.length - 1];
    expect(message).toEqual({
      type: 'AUTOFILL_COMPLETE',
      filledCount: 0,
      missingClawIds: ['jobify-field-999'],
    });

    captured.restore();
  });

  it('selects option by trimmed case-insensitive option text', () => {
    setupDom();
    const captured = captureBridgeMessages();
    runInjectedScript(SCRAPE_PAGE_JS);

    const mappings: FieldMapping[] = [
      { clawId: 'jobify-field-4', fieldLabel: 'Years of experience', value: '6+ years', source: 'PROFILE' },
    ];

    runInjectedScript(buildAutoFillScript(mappings));

    const message = captured.messages[captured.messages.length - 1];
    expect(message).toEqual({
      type: 'AUTOFILL_COMPLETE',
      filledCount: 1,
      missingClawIds: [],
    });

    const selectEl = document.querySelector('[data-jobify-id="jobify-field-4"]') as HTMLSelectElement;
    expect(selectEl.value).toBe('6+');
    const stateText = document.getElementById('state')?.textContent ?? '';
    expect(stateText).toContain('years=6+');

    captured.restore();
  });

  it('reports missing when select has no matching value or text', () => {
    setupDom();
    const captured = captureBridgeMessages();
    runInjectedScript(SCRAPE_PAGE_JS);

    const mappings: FieldMapping[] = [
      { clawId: 'jobify-field-4', fieldLabel: 'Years of experience', value: 'ten', source: 'PROFILE' },
    ];

    runInjectedScript(buildAutoFillScript(mappings));

    const message = captured.messages[captured.messages.length - 1];
    expect(message).toEqual({
      type: 'AUTOFILL_COMPLETE',
      filledCount: 0,
      missingClawIds: ['jobify-field-4'],
    });

    captured.restore();
  });

  it('writes textarea value with quotes, backslash, </script>, and newline verbatim', () => {
    setupDom();
    const captured = captureBridgeMessages();
    runInjectedScript(SCRAPE_PAGE_JS);

    const complexValue = 'Quotes: "double" and \'single\'\nBackslash: \\path\\to\\file\nHTML: </script><script>alert(1)</script>';
    const mappings: FieldMapping[] = [
      { clawId: 'jobify-field-3', fieldLabel: 'Why Acme Cloud?', value: complexValue, source: 'GENERATED' },
    ];

    runInjectedScript(buildAutoFillScript(mappings));

    const message = captured.messages[captured.messages.length - 1];
    expect(message).toEqual({
      type: 'AUTOFILL_COMPLETE',
      filledCount: 1,
      missingClawIds: [],
    });

    const textarea = document.querySelector('[data-jobify-id="jobify-field-3"]') as HTMLTextAreaElement;
    expect(textarea.value).toBe(complexValue);

    captured.restore();
  });
});
