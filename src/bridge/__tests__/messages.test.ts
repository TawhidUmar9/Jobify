import { SCRAPE_LIMITS, parseBridgeMessage, type ScrapedInput } from '../messages';

function input(index: number): ScrapedInput {
  return {
    clawId: `jobify-field-${index}`,
    tag: 'input',
    type: 'text',
    name: 'full_name',
    id: 'name',
    placeholder: '',
    ariaLabel: '',
    label: 'Full name',
  };
}

describe('parseBridgeMessage', () => {
  it('accepts one valid message of each type', () => {
    const page = parseBridgeMessage(
      JSON.stringify({
        type: 'PAGE_SCRAPED',
        url: 'https://jobs.example/1',
        title: 'Role',
        pageText: 'Hello',
        inputs: [{ ...input(0), tag: 'select', type: 'select-one', options: [{ value: 'a', text: 'A' }] }],
      }),
    );
    expect(page).toEqual({
      ok: true,
      value: {
        type: 'PAGE_SCRAPED',
        url: 'https://jobs.example/1',
        title: 'Role',
        pageText: 'Hello',
        inputs: [{ ...input(0), tag: 'select', type: 'select-one', options: [{ value: 'a', text: 'A' }] }],
      },
    });
    expect(parseBridgeMessage(JSON.stringify({ type: 'SCRAPE_ERROR', error: 'boom' }))).toEqual({
      ok: true,
      value: { type: 'SCRAPE_ERROR', error: 'boom' },
    });
    expect(
      parseBridgeMessage(JSON.stringify({ type: 'AUTOFILL_COMPLETE', filledCount: 2, missingClawIds: ['jobify-field-1'] })),
    ).toEqual({ ok: true, value: { type: 'AUTOFILL_COMPLETE', filledCount: 2, missingClawIds: ['jobify-field-1'] } });
    expect(parseBridgeMessage(JSON.stringify({ type: 'AUTOFILL_ERROR', error: 'nope' }))).toEqual({
      ok: true,
      value: { type: 'AUTOFILL_ERROR', error: 'nope' },
    });
  });

  it('rejects bad JSON, unknown types, and wrong field types without throwing', () => {
    expect(parseBridgeMessage('{')).toEqual({ ok: false, error: 'INVALID_JSON' });
    expect(parseBridgeMessage(JSON.stringify({ type: 'OTHER' }))).toEqual({ ok: false, error: 'UNKNOWN_TYPE' });
    expect(parseBridgeMessage(JSON.stringify({ type: 'SCRAPE_ERROR', error: 1 }))).toEqual({ ok: false, error: 'INVALID_SHAPE' });
    expect(parseBridgeMessage(JSON.stringify({ type: 'PAGE_SCRAPED', url: 'https://x', title: 't', pageText: 'p', inputs: [{ ...input(0), options: [] }] }))).toEqual({
      ok: false,
      error: 'INVALID_SHAPE',
    });
    expect(() => parseBridgeMessage(null as never)).not.toThrow();
    expect(() => parseBridgeMessage(1 as never)).not.toThrow();
    expect(() => parseBridgeMessage([] as never)).not.toThrow();
    expect(parseBridgeMessage(null as never).ok).toBe(false);
    expect(parseBridgeMessage(1 as never).ok).toBe(false);
    expect(parseBridgeMessage([] as never).ok).toBe(false);
  });

  it('truncates page text to 12000 characters and inputs to 80', () => {
    const inputs = Array.from({ length: 100 }, (_, index) => input(index));
    const parsed = parseBridgeMessage(
      JSON.stringify({
        type: 'PAGE_SCRAPED',
        url: 'https://jobs.example',
        title: 'Role',
        pageText: 'x'.repeat(20000),
        inputs,
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.value.type !== 'PAGE_SCRAPED') return;
    expect(parsed.value.pageText).toHaveLength(SCRAPE_LIMITS.pageTextMaxChars);
    expect(parsed.value.inputs).toHaveLength(SCRAPE_LIMITS.maxInputs);
  });
});
