import { isHttpUrl } from '../url';

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
