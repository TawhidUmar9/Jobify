import { displayHost, extractFirstUrl, isHttpUrl, normalizeAddressInput } from '../url';

describe('isHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isHttpUrl('https://example.com/jobs')).toBe(true);
    expect(isHttpUrl('http://10.0.2.2:8787/x')).toBe(true);
  });

  it('rejects other schemes, empty values, and plain text', () => {
    expect(isHttpUrl('mailto:alex@example.com')).toBe(false);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
    expect(isHttpUrl(null)).toBe(false);
    expect(isHttpUrl(undefined)).toBe(false);
    expect(isHttpUrl('wellfound.com/jobs')).toBe(false);
  });
});

describe('normalizeAddressInput', () => {
  it('prefixes a host that has no scheme and rejects text that is not a URL', () => {
    expect(normalizeAddressInput('wellfound.com/jobs')).toBe('https://wellfound.com/jobs');
    expect(normalizeAddressInput('  wellfound.com/jobs  ')).toBe('https://wellfound.com/jobs');
    expect(normalizeAddressInput('https://example.com/a')).toBe('https://example.com/a');
    expect(normalizeAddressInput('http://10.0.2.2:8787/x')).toBe('http://10.0.2.2:8787/x');
    expect(normalizeAddressInput('hello world')).toBeNull();
    expect(normalizeAddressInput('javascript:alert(1)')).toBeNull();
    expect(normalizeAddressInput('')).toBeNull();
  });
});

describe('displayHost', () => {
  it('strips a leading www and leaves non-URLs unchanged', () => {
    expect(displayHost('https://www.wellfound.com/jobs')).toBe('wellfound.com');
    expect(displayHost('https://boards.example/jobs')).toBe('boards.example');
    expect(displayHost('not a url')).toBe('not a url');
  });
});

describe('extractFirstUrl', () => {
  it('returns the first http(s) URL with trailing punctuation removed', () => {
    expect(extractFirstUrl('Check this job https://x.y/z via LinkedIn')).toBe('https://x.y/z');
    expect(extractFirstUrl('Look https://x.y/z.')).toBe('https://x.y/z');
    expect(extractFirstUrl('See https://x.y/z). next')).toBe('https://x.y/z');
    expect(extractFirstUrl('no link here')).toBeNull();
    expect(extractFirstUrl(null)).toBeNull();
    expect(extractFirstUrl(undefined)).toBeNull();
  });
});
