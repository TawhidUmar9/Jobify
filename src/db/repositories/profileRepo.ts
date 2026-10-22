import type { SQLiteDatabase } from 'expo-sqlite';

import type { CandidateProfile, JobPreferences } from '../../types/domain';

/**
 * Profile and preferences are single rows (id = 1) holding JSON.
 * Reads run the JSON through normalizeProfile / normalizePreferences (src/lib/normalize.ts).
 */

/** The saved profile, or null if none saved yet. Unparseable JSON → normalizeProfile(null). */
export async function getProfile(db: SQLiteDatabase): Promise<CandidateProfile | null> {
  // TODO(T-006): implement.
  void db;
  return null;
}

/** Upserts row 1 with JSON.stringify(normalizeProfile(profile)) and updated_at = CURRENT_TIMESTAMP. */
export async function saveProfile(db: SQLiteDatabase, profile: CandidateProfile): Promise<void> {
  // TODO(T-006): implement (INSERT … ON CONFLICT(id) DO UPDATE).
  void db;
  void profile;
}

/** The saved preferences, or DEFAULT_PREFERENCES when none saved. */
export async function getPreferences(db: SQLiteDatabase): Promise<JobPreferences> {
  // TODO(T-006): implement.
  void db;
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

/** Upserts row 1 with normalized preferences. */
export async function savePreferences(db: SQLiteDatabase, preferences: JobPreferences): Promise<void> {
  // TODO(T-006): implement.
  void db;
  void preferences;
}
