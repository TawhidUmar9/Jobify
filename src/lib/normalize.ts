import type { CandidateProfile, JobPreferences } from '../types/domain';

/**
 * Normalisers for JSON stored in SQLite and for imported backups. Never throw.
 * CONTRACT: used by profileRepo, preferencesRepo, backup import. Tests in T-006.
 */

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
  // TODO(T-006): implement per the rules above.
  void value;
  return {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    countryCode: '',
    timeZone: '',
    headline: '',
    summary: '',
    links: [],
    skills: [],
    experience: [],
    education: [],
    extraFacts: [],
  };
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
  // TODO(T-006): implement per the rules above.
  void value;
  return {
    targetRoles: [],
    workModes: ['REMOTE'],
    workAuthorizedCountries: [],
    openToSponsorship: false,
    minTimeZoneOverlapHours: 2,
    minSalary: null,
    salaryCurrency: 'USD',
    blockedCompanies: [],
  };
}
