/**
 * Architect-owned sanity checks on contract files. Must stay green from T-001 onward.
 * Feature tests are added by the dev agent (src/<area>/__tests__) and the tester (tests/acceptance).
 */
import { CLAW_ID_PREFIX, SCRAPE_LIMITS } from '../../src/bridge/messages';
import { TestIds } from '../../src/constants/testIds';
import { SEED_BOARDS } from '../../src/data/seedBoards';
import { DB_VERSION, MIGRATIONS } from '../../src/db/schema';
import { JOB_ANALYSIS_SCHEMA, RESUME_PARSE_SCHEMA, TAILOR_SCHEMA } from '../../src/services/ai/schemas';
import { AI_DEFAULTS, AI_ERROR_MESSAGES, AI_PROVIDER_KINDS } from '../../src/services/ai/types';
import { darkColors, lightColors } from '../../src/theme/tokens';
import {
  APPLICATION_STATUSES,
  ELIGIBILITIES,
  FIELD_SOURCES,
  RED_FLAG_CODES,
  RESPONSE_STATUSES,
} from '../../src/types/domain';

function staticTestIds(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(node);
  else if (node && typeof node === 'object') Object.values(node).forEach((v) => staticTestIds(v, out));
  return out;
}

describe('contracts', () => {
  it('has one migration per schema version', () => {
    expect(MIGRATIONS).toHaveLength(DB_VERSION);
  });

  it('seeds job boards with https URLs, short names, and sequential order', () => {
    expect(SEED_BOARDS.length).toBeGreaterThan(0);
    SEED_BOARDS.forEach((b, i) => {
      expect(b.url.startsWith('https://')).toBe(true);
      expect(b.name.length).toBeLessThanOrEqual(16);
      expect(b.sortOrder).toBe(i);
    });
  });

  it('keeps AI schema enums equal to domain enums', () => {
    const p = JOB_ANALYSIS_SCHEMA.properties!;
    expect([...(p.eligibility.enum ?? [])]).toEqual([...ELIGIBILITIES]);
    expect([...(p.redFlags.items!.properties!.code.enum ?? [])]).toEqual([...RED_FLAG_CODES]);
    expect([...(p.fieldMappings.items!.properties!.source.enum ?? [])]).toEqual([...FIELD_SOURCES]);
  });

  it('requires every declared property in the AI schemas', () => {
    for (const schema of [JOB_ANALYSIS_SCHEMA, TAILOR_SCHEMA, RESUME_PARSE_SCHEMA]) {
      expect([...(schema.required ?? [])].sort()).toEqual(Object.keys(schema.properties ?? {}).sort());
    }
  });

  it('keeps schema CHECK constraints in sync with domain enums', () => {
    const sql = MIGRATIONS[0];
    [...APPLICATION_STATUSES, ...ELIGIBILITIES].forEach((v) => expect(sql).toContain(`'${v}'`));
    RESPONSE_STATUSES.forEach((s) => expect(APPLICATION_STATUSES).toContain(s));
  });

  it('never stores secrets in SQLite', () => {
    expect(MIGRATIONS.join('\n').toLowerCase()).not.toMatch(/api_?key|secret|token/);
  });

  it('has defaults and messages for every AI provider and error', () => {
    AI_PROVIDER_KINDS.forEach((k) => expect(AI_DEFAULTS[k].provider).toBe(k));
    Object.values(AI_ERROR_MESSAGES).forEach((m) => expect(m.length).toBeGreaterThan(10));
  });

  it('has unique static testIDs', () => {
    const ids = staticTestIds(TestIds);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('defines the same color tokens for light and dark', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('exposes bridge limits', () => {
    expect(CLAW_ID_PREFIX).toBe('jobify-field-');
    expect(SCRAPE_LIMITS.pageTextMaxChars).toBe(12000);
  });
});
