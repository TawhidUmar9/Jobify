import type { CandidateProfile, ExperienceEntry, JobPreferences, ProfileLink, WorkMode } from '../types/domain';
import { DEFAULT_PREFERENCES, EMPTY_PROFILE, WORK_MODES } from '../types/domain';
import { isHttpUrl } from './url';

/**
 * Normalisers for JSON stored in SQLite and for imported backups. Never throw.
 * CONTRACT: used by profileRepo, preferencesRepo, backup import. Tests in T-006.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Trim, drop empty, de-duplicate case-insensitively, then cap. */
function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (trimmed === '') continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

function emptyProfile(): CandidateProfile {
  return {
    ...EMPTY_PROFILE,
    links: [],
    skills: [],
    experience: [],
    education: [],
    extraFacts: [],
  };
}

/**
 * Returns a complete CandidateProfile from any value:
 * - Non-object → EMPTY_PROFILE copy.
 * - Each string field: keep if string (trimmed), else ''.
 * - links: keep {label,url} where both strings, url passes isHttpUrl; max 10.
 * - skills / extraFacts: string lists (trim, drop empty, case-insensitive de-dup), max 50 / 20.
 * - experience (max 15) / education (max 10): keep objects; coerce each field to a trimmed string;
 *   bullets string list max 10.
 * - countryCode: upper-case if it matches /^[A-Za-z]{2}$/, else ''.
 */
export function normalizeProfile(value: unknown): CandidateProfile {
  if (!isRecord(value)) return emptyProfile();

  const countryRaw = trimmedString(value.countryCode);
  const countryCode = /^[A-Za-z]{2}$/.test(countryRaw) ? countryRaw.toUpperCase() : '';

  return {
    fullName: trimmedString(value.fullName),
    email: trimmedString(value.email),
    phone: trimmedString(value.phone),
    location: trimmedString(value.location),
    countryCode,
    timeZone: trimmedString(value.timeZone),
    headline: trimmedString(value.headline),
    summary: trimmedString(value.summary),
    links: normalizeLinks(value.links),
    skills: stringList(value.skills, 50),
    experience: normalizeExperience(value.experience),
    education: normalizeEducation(value.education),
    extraFacts: stringList(value.extraFacts, 20),
  };
}

function normalizeLinks(value: unknown): ProfileLink[] {
  if (!Array.isArray(value)) return [];
  const links: ProfileLink[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const label = trimmedString(item.label);
    const url = trimmedString(item.url);
    if (label === '' || !isHttpUrl(url)) continue;
    links.push({ label, url });
    if (links.length >= 10) break;
  }
  return links;
}

function normalizeExperience(value: unknown): ExperienceEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: ExperienceEntry[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    entries.push({
      title: trimmedString(item.title),
      company: trimmedString(item.company),
      start: trimmedString(item.start),
      end: trimmedString(item.end),
      bullets: stringList(item.bullets, 10),
    });
    if (entries.length >= 15) break;
  }
  return entries;
}

function normalizeEducation(value: unknown): CandidateProfile['education'] {
  if (!Array.isArray(value)) return [];
  const entries: CandidateProfile['education'] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    entries.push({
      school: trimmedString(item.school),
      degree: trimmedString(item.degree),
      year: trimmedString(item.year),
    });
    if (entries.length >= 10) break;
  }
  return entries;
}

function isWorkMode(value: string): value is WorkMode {
  return (WORK_MODES as readonly string[]).includes(value);
}

/**
 * Returns complete JobPreferences from any value, starting from DEFAULT_PREFERENCES:
 * - targetRoles string list max 10; blockedCompanies string list max 50.
 * - workModes: keep values in WORK_MODES, de-dup; empty → ['REMOTE'].
 * - workAuthorizedCountries: upper-case 2-letter codes only, de-dup.
 * - openToSponsorship: boolean, else false.
 * - minTimeZoneOverlapHours: integer clamp 0–8, else 2.
 * - minSalary: finite number > 0 rounded, else null. salaryCurrency: /^[A-Z]{3}$/ after upper-casing, else 'USD'.
 */
export function normalizePreferences(value: unknown): JobPreferences {
  if (!isRecord(value)) {
    return {
      ...DEFAULT_PREFERENCES,
      targetRoles: [],
      workModes: ['REMOTE'],
      workAuthorizedCountries: [],
      blockedCompanies: [],
    };
  }

  const workModes = normalizeWorkModes(value.workModes);
  const currencyRaw = trimmedString(value.salaryCurrency).toUpperCase();

  return {
    targetRoles: stringList(value.targetRoles, 10),
    workModes,
    workAuthorizedCountries: normalizeCountries(value.workAuthorizedCountries),
    openToSponsorship: value.openToSponsorship === true,
    minTimeZoneOverlapHours: normalizeOverlap(value.minTimeZoneOverlapHours),
    minSalary: normalizeSalary(value.minSalary),
    salaryCurrency: /^[A-Z]{3}$/.test(currencyRaw) ? currencyRaw : 'USD',
    blockedCompanies: stringList(value.blockedCompanies, 50),
  };
}

function normalizeWorkModes(value: unknown): WorkMode[] {
  if (!Array.isArray(value)) return ['REMOTE'];
  const modes: WorkMode[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !isWorkMode(item) || modes.includes(item)) continue;
    modes.push(item);
  }
  return modes.length > 0 ? modes : ['REMOTE'];
}

function normalizeCountries(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const codes: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const code = item.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code) || seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

function normalizeOverlap(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) return 2;
  return Math.min(8, Math.max(0, value));
}

function normalizeSalary(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}
