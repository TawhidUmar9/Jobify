import { captureBridgeMessages, installInnerTextPolyfill, runInjectedScript } from '../../../tests/helpers/dom';
import { parseBridgeMessage } from '../messages';
import { SCRAPE_PAGE_JS } from '../scrapePageScript';

/** Same document as e2e/fixtures/pages/job-remote-form.html (this package has no Node typings). */
const JOB_REMOTE_FORM_HTML = `<!doctype html>
<html lang="en"><head><title>Senior Backend Engineer - Acme Cloud</title></head>
<body>
<h1>Senior Backend Engineer</h1>
<p>Acme Cloud is hiring a Senior Backend Engineer. This role is fully remote.</p>
<form id="apply">
  <label for="full_name">Full name</label>
  <input id="full_name" name="full_name" type="text">
  <label for="email">Email</label>
  <input id="email" name="email" type="email">
  <input name="portfolio" type="url" aria-label="Portfolio URL" placeholder="https://">
  <label>Why Acme Cloud?
    <textarea name="why" rows="4"></textarea>
  </label>
  <label for="years">Years of experience</label>
  <select id="years" name="years">
    <option value="">Choose…</option>
    <option value="0-2">0–2 years</option>
    <option value="3-5">3–5 years</option>
    <option value="6+">6+ years</option>
  </select>
  <input type="password" name="password" aria-label="Password">
  <input type="hidden" name="csrf" value="x">
  <input type="checkbox" name="terms" aria-label="Accept terms">
  <input type="file" name="resume" aria-label="Resume">
  <input type="text" name="honeypot" style="display:none">
  <input type="text" name="disabled_field" disabled aria-label="Disabled">
</form>
</body></html>`;

function loadFixture(): void {
  document.open();
  document.write(JOB_REMOTE_FORM_HTML);
  document.close();
  installInnerTextPolyfill();
}

describe('SCRAPE_PAGE_JS', () => {
  it('ends with true;', () => {
    expect(SCRAPE_PAGE_JS.trim().endsWith('true;')).toBe(true);
  });

  it('scrapes the remote form fixture and ignores excluded controls', () => {
    loadFixture();
    const password = document.querySelector('[name="password"]');
    password?.setAttribute('data-jobify-id', 'stale');
    const captured = captureBridgeMessages();
    runInjectedScript(SCRAPE_PAGE_JS);
    runInjectedScript(SCRAPE_PAGE_JS);

    expect(password?.hasAttribute('data-jobify-id')).toBe(false);
    const message = captured.messages[captured.messages.length - 1];
    const parsed = parseBridgeMessage(JSON.stringify(message));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.value.type !== 'PAGE_SCRAPED') return;
    expect(parsed.value.inputs.map((item) => item.name)).toEqual(['full_name', 'email', 'portfolio', 'why', 'years']);
    expect(parsed.value.inputs.map((item) => item.clawId)).toEqual([
      'jobify-field-0',
      'jobify-field-1',
      'jobify-field-2',
      'jobify-field-3',
      'jobify-field-4',
    ]);
    expect(parsed.value.inputs[2]?.ariaLabel).toBe('Portfolio URL');
    expect(parsed.value.inputs[3]?.label).toBe('Why Acme Cloud?');
    expect(parsed.value.inputs[4]?.options).toHaveLength(4);
    expect(parsed.value.title).toBe('Senior Backend Engineer - Acme Cloud');
    captured.restore();
  });

  it('caps page text at 12000 characters and inputs at 80', () => {
    document.body.innerHTML = `<p>${'word '.repeat(4000)}</p>${Array.from({ length: 90 }, (_, index) => `<input name="f${index}">`).join('')}`;
    installInnerTextPolyfill();
    const captured = captureBridgeMessages();
    runInjectedScript(SCRAPE_PAGE_JS);
    const parsed = parseBridgeMessage(JSON.stringify(captured.messages[0]));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.value.type !== 'PAGE_SCRAPED') return;
    expect(parsed.value.pageText.length).toBeLessThanOrEqual(12000);
    expect(parsed.value.pageText).toHaveLength(12000);
    expect(parsed.value.inputs).toHaveLength(80);
    captured.restore();
  });

  it('posts SCRAPE_ERROR when the page throws', () => {
    document.body.innerHTML = '<input name="a">';
    const original = document.querySelectorAll.bind(document);
    document.querySelectorAll = () => {
      throw new Error('blocked');
    };
    const captured = captureBridgeMessages();
    runInjectedScript(SCRAPE_PAGE_JS);
    document.querySelectorAll = original;
    expect(captured.messages[0]).toEqual({ type: 'SCRAPE_ERROR', error: 'blocked' });
    expect(parseBridgeMessage(JSON.stringify(captured.messages[0])).ok).toBe(true);
    captured.restore();
  });
});
