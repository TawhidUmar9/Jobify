import { parseDbTimestamp } from '../dates';

describe('parseDbTimestamp', () => {
  it('reads SQLite stamps as UTC', () => {
    expect(parseDbTimestamp('2026-10-22 20:13:05')?.getTime()).toBe(Date.UTC(2026, 9, 22, 20, 13, 5));
    expect(parseDbTimestamp('2026-10-22T20:13:05')?.getTime()).toBe(Date.UTC(2026, 9, 22, 20, 13, 5));
  });

  it('accepts a bare date as UTC midnight', () => {
    expect(parseDbTimestamp('2026-10-22')?.getTime()).toBe(Date.UTC(2026, 9, 22));
  });

  it('returns null for anything else', () => {
    expect(parseDbTimestamp('')).toBeNull();
    expect(parseDbTimestamp('22 Oct 2026')).toBeNull();
  });
});
