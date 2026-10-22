import type { ScrapedInput } from '../../bridge/messages';
import type { Result } from '../../lib/result';
import type { CandidateProfile, JobAnalysis, Resume, ResumeContent, TailorResult } from '../../types/domain';

/**
 * Validators turn untrusted AI JSON into domain types. CONTRACT: each rule has a unit test (T-012).
 * Common rules: never throw; trim every string; non-object input → err('SCHEMA_MISMATCH');
 * "string list" = keep non-empty trimmed strings, de-duplicate case-insensitively keeping the
 * first, then cap to the stated max.
 */

/**
 * validateJobAnalysis rules:
 * - companyName/roleTitle must be strings; empty → "Unknown company" / "Unknown role".
 * - eligibilityReason, resumeReason: strings (empty allowed); missing → SCHEMA_MISMATCH.
 * - eligibility not in ELIGIBILITIES → 'UNCLEAR'.
 * - redFlags: array required; keep items whose code is in RED_FLAG_CODES (unknown code → 'OTHER')
 *   and whose detail is a non-empty string; max 8; de-duplicate by code+detail.
 * - matchScore: finite number required, else SCHEMA_MISMATCH; Math.round, clamp 0–100.
 * - recommendedResumeId: if it equals some resumes[i].id keep it; else resumes[0]?.id ?? null.
 * - matchedSkills/missingSkills: string lists, max 20 each; missing → [].
 * - fieldMappings: array required. Keep an item only if clawId equals some inputs[i].clawId,
 *   value is a non-empty string, and clawId was not already kept. fieldLabel: string or
 *   fallback to the input's label || ariaLabel || placeholder || name. source not in
 *   FIELD_SOURCES → 'GENERATED'.
 */
export function validateJobAnalysis(
  raw: unknown,
  inputs: readonly ScrapedInput[],
  resumes: readonly Pick<Resume, 'id'>[],
): Result<JobAnalysis, 'SCHEMA_MISMATCH'> {
  // TODO(T-012): implement per the rules above.
  void raw;
  void inputs;
  void resumes;
  return { ok: false, error: 'SCHEMA_MISMATCH' };
}

/**
 * validateTailor rules:
 * - emphasize: string list, max 5. bulletRewrites: keep items with non-empty original and
 *   suggested (reason may be empty), max 5.
 * - coverNote, coldDm: strings required (may be empty); missing → SCHEMA_MISMATCH.
 */
export function validateTailor(raw: unknown): Result<TailorResult, 'SCHEMA_MISMATCH'> {
  // TODO(T-012): implement per the rules above.
  void raw;
  return { ok: false, error: 'SCHEMA_MISMATCH' };
}

export interface ResumeParseResult {
  /** Fields to merge into the profile. countryCode/timeZone/extraFacts are never set by the AI. */
  profile: Omit<CandidateProfile, 'countryCode' | 'timeZone' | 'extraFacts'>;
  content: ResumeContent;
}

/**
 * validateResumeParse rules:
 * - All top-level keys of RESUME_PARSE_SCHEMA required with the right JSON type, else SCHEMA_MISMATCH.
 * - links: keep items whose url is http(s) (use isHttpUrl) and label non-empty; max 10.
 * - skills: string list max 50. highlights: string list max 10.
 * - experience: keep items with non-empty title or company; bullets string list max 10; max 15 items.
 * - education: keep items with non-empty school or degree; max 10.
 * - content = { summary: profile.summary, skills: profile.skills, highlights }.
 */
export function validateResumeParse(raw: unknown): Result<ResumeParseResult, 'SCHEMA_MISMATCH'> {
  // TODO(T-012): implement per the rules above.
  void raw;
  return { ok: false, error: 'SCHEMA_MISMATCH' };
}
