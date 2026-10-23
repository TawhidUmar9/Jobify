import type { ScrapedInput } from '../../bridge/messages';
import { err, ok, type Result } from '../../lib/result';
import { isHttpUrl } from '../../lib/url';
import {
  ELIGIBILITIES,
  FIELD_SOURCES,
  RED_FLAG_CODES,
  type BulletRewrite,
  type CandidateProfile,
  type EducationEntry,
  type Eligibility,
  type ExperienceEntry,
  type FieldMapping,
  type FieldSource,
  type JobAnalysis,
  type ProfileLink,
  type RedFlag,
  type RedFlagCode,
  type Resume,
  type ResumeContent,
  type TailorResult,
} from '../../types/domain';

import { RESUME_PARSE_SCHEMA } from './schemas';

/**
 * Validators turn untrusted AI JSON into domain types. CONTRACT: each rule has a unit test (T-012).
 * Common rules: never throw; trim every string; non-object input → err('SCHEMA_MISMATCH');
 * "string list" = keep non-empty trimmed strings, de-duplicate case-insensitively keeping the
 * first, then cap to the stated max.
 */

type Mismatch = Result<never, 'SCHEMA_MISMATCH'>;

function mismatch(): Mismatch {
  return err('SCHEMA_MISMATCH');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (trimmed.length === 0) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(trimmed);
    if (kept.length === max) break;
  }
  return kept;
}

function isEligibility(value: string): value is Eligibility {
  return (ELIGIBILITIES as readonly string[]).includes(value);
}

function isFieldSource(value: string): value is FieldSource {
  return (FIELD_SOURCES as readonly string[]).includes(value);
}

function isRedFlagCode(value: string): value is RedFlagCode {
  return (RED_FLAG_CODES as readonly string[]).includes(value);
}

function requiredString(record: Record<string, unknown>, key: string): string | Mismatch {
  const value = record[key];
  if (typeof value !== 'string') return mismatch();
  return value.trim();
}

function namedOrUnknown(record: Record<string, unknown>, key: string, fallback: string): string | Mismatch {
  const value = requiredString(record, key);
  if (typeof value !== 'string') return value;
  return value.length === 0 ? fallback : value;
}

/**
 * validateJobAnalysis rules:
 * - isJobPosting: boolean kept; missing or not boolean → true (lenient for models that omit it).
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
  try {
    if (!isRecord(raw)) return mismatch();
    const companyName = namedOrUnknown(raw, 'companyName', 'Unknown company');
    if (typeof companyName !== 'string') return companyName;
    const roleTitle = namedOrUnknown(raw, 'roleTitle', 'Unknown role');
    if (typeof roleTitle !== 'string') return roleTitle;
    const eligibilityReason = requiredString(raw, 'eligibilityReason');
    if (typeof eligibilityReason !== 'string') return eligibilityReason;
    const resumeReason = requiredString(raw, 'resumeReason');
    if (typeof resumeReason !== 'string') return resumeReason;
    if (!Array.isArray(raw.redFlags)) return mismatch();
    if (typeof raw.matchScore !== 'number' || !Number.isFinite(raw.matchScore)) return mismatch();
    if (!Array.isArray(raw.fieldMappings)) return mismatch();

    const isJobPosting = typeof raw.isJobPosting === 'boolean' ? raw.isJobPosting : true;
    const eligibility =
      typeof raw.eligibility === 'string' && isEligibility(raw.eligibility) ? raw.eligibility : 'UNCLEAR';
    const redFlags = parseRedFlags(raw.redFlags);
    const rounded = Math.round(raw.matchScore);
    const matchScore = Math.min(100, Math.max(0, rounded));
    const matchedResume = resumes.find((resume) => resume.id === raw.recommendedResumeId);
    const recommendedResumeId = matchedResume ? matchedResume.id : (resumes[0]?.id ?? null);

    return ok({
      isJobPosting,
      companyName,
      roleTitle,
      eligibility,
      eligibilityReason,
      redFlags,
      matchScore,
      recommendedResumeId,
      resumeReason,
      matchedSkills: stringList(raw.matchedSkills, 20),
      missingSkills: stringList(raw.missingSkills, 20),
      fieldMappings: parseFieldMappings(raw.fieldMappings, inputs),
    });
  } catch {
    return mismatch();
  }
}

function parseRedFlags(items: unknown[]): RedFlag[] {
  const flags: RedFlag[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!isRecord(item)) continue;
    const code =
      typeof item.code === 'string' && isRedFlagCode(item.code.trim()) ? (item.code.trim() as RedFlagCode) : 'OTHER';
    if (typeof item.detail !== 'string') continue;
    const detail = item.detail.trim();
    if (detail.length === 0) continue;
    const key = `${code}\u0000${detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    flags.push({ code, detail });
    if (flags.length === 8) break;
  }
  return flags;
}

function fallbackLabel(input: ScrapedInput): string {
  const candidates = [input.label, input.ariaLabel, input.placeholder, input.name];
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return '';
}

function parseFieldMappings(items: unknown[], inputs: readonly ScrapedInput[]): FieldMapping[] {
  const byId = new Map(inputs.map((input) => [input.clawId, input]));
  const mappings: FieldMapping[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!isRecord(item) || typeof item.clawId !== 'string' || typeof item.value !== 'string') continue;
    const clawId = item.clawId.trim();
    const value = item.value.trim();
    const input = byId.get(clawId);
    if (!input || value.length === 0 || seen.has(clawId)) continue;
    const label = typeof item.fieldLabel === 'string' ? item.fieldLabel.trim() : '';
    const source =
      typeof item.source === 'string' && isFieldSource(item.source.trim())
        ? (item.source.trim() as FieldSource)
        : 'GENERATED';
    seen.add(clawId);
    mappings.push({
      clawId,
      fieldLabel: label.length > 0 ? label : fallbackLabel(input),
      value,
      source,
    });
  }
  return mappings;
}

/**
 * validateTailor rules:
 * - emphasize: string list, max 5. bulletRewrites: keep items with non-empty original and
 *   suggested (reason may be empty), max 5.
 * - coverNote, coldDm: strings required (may be empty); missing → SCHEMA_MISMATCH.
 */
export function validateTailor(raw: unknown): Result<TailorResult, 'SCHEMA_MISMATCH'> {
  try {
    if (!isRecord(raw)) return mismatch();
    const coverNote = requiredString(raw, 'coverNote');
    if (typeof coverNote !== 'string') return coverNote;
    const coldDm = requiredString(raw, 'coldDm');
    if (typeof coldDm !== 'string') return coldDm;
    return ok({
      emphasize: stringList(raw.emphasize, 5),
      bulletRewrites: parseBulletRewrites(raw.bulletRewrites),
      coverNote,
      coldDm,
    });
  } catch {
    return mismatch();
  }
}

function parseBulletRewrites(value: unknown): BulletRewrite[] {
  if (!Array.isArray(value)) return [];
  const rewrites: BulletRewrite[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.original !== 'string' || typeof item.suggested !== 'string') continue;
    const original = item.original.trim();
    const suggested = item.suggested.trim();
    if (original.length === 0 || suggested.length === 0) continue;
    const reason = typeof item.reason === 'string' ? item.reason.trim() : '';
    rewrites.push({ original, suggested, reason });
    if (rewrites.length === 5) break;
  }
  return rewrites;
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
  try {
    if (!isRecord(raw)) return mismatch();
    const properties = RESUME_PARSE_SCHEMA.properties;
    if (!properties) return mismatch();
    for (const [key, schema] of Object.entries(properties)) {
      const value = raw[key];
      if (schema.type === 'array') {
        if (!Array.isArray(value)) return mismatch();
      } else if (schema.type === 'string') {
        if (typeof value !== 'string') return mismatch();
      } else if (typeof value !== schema.type) {
        return mismatch();
      }
    }
    const fullName = requiredString(raw, 'fullName');
    const email = requiredString(raw, 'email');
    const phone = requiredString(raw, 'phone');
    const location = requiredString(raw, 'location');
    const headline = requiredString(raw, 'headline');
    const summary = requiredString(raw, 'summary');
    if (
      typeof fullName !== 'string' ||
      typeof email !== 'string' ||
      typeof phone !== 'string' ||
      typeof location !== 'string' ||
      typeof headline !== 'string' ||
      typeof summary !== 'string'
    ) {
      return mismatch();
    }
    const skills = stringList(raw.skills, 50);
    const highlights = stringList(raw.highlights, 10);
    const profile: ResumeParseResult['profile'] = {
      fullName,
      email,
      phone,
      location,
      headline,
      summary,
      links: parseLinks(raw.links),
      skills,
      experience: parseExperience(raw.experience),
      education: parseEducation(raw.education),
    };
    return ok({ profile, content: { summary, skills, highlights } });
  } catch {
    return mismatch();
  }
}

function parseLinks(value: unknown): ProfileLink[] {
  if (!Array.isArray(value)) return [];
  const links: ProfileLink[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.label !== 'string' || typeof item.url !== 'string') continue;
    const label = item.label.trim();
    const url = item.url.trim();
    if (label.length === 0 || !isHttpUrl(url)) continue;
    links.push({ label, url });
    if (links.length === 10) break;
  }
  return links;
}

function textField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
}

function parseExperience(value: unknown): ExperienceEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: ExperienceEntry[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const title = textField(item, 'title');
    const company = textField(item, 'company');
    if (title.length === 0 && company.length === 0) continue;
    entries.push({
      title,
      company,
      start: textField(item, 'start'),
      end: textField(item, 'end'),
      bullets: stringList(item.bullets, 10),
    });
    if (entries.length === 15) break;
  }
  return entries;
}

function parseEducation(value: unknown): EducationEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: EducationEntry[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const school = textField(item, 'school');
    const degree = textField(item, 'degree');
    if (school.length === 0 && degree.length === 0) continue;
    entries.push({ school, degree, year: textField(item, 'year') });
    if (entries.length === 10) break;
  }
  return entries;
}
