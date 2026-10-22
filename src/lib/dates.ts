/**
 * SQLite stamps ("YYYY-MM-DD HH:MM:SS", from CURRENT_TIMESTAMP / datetime('now')) are UTC.
 * Parse them with this, then read local fields (getDate, getMonth…) for display.
 */
export function parseDbTimestamp(stamp: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/.exec(stamp);
  if (!match) return null;
  const date = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4] ?? 0),
      Number(match[5] ?? 0),
      Number(match[6] ?? 0),
    ),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}
