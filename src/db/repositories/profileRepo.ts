import type { SQLiteDatabase } from 'expo-sqlite';

import { normalizePreferences, normalizeProfile } from '../../lib/normalize';
import { DEFAULT_PREFERENCES, type CandidateProfile, type JobPreferences } from '../../types/domain';

/**
 * Profile and preferences are single rows (id = 1) holding JSON.
 * Reads run the JSON through normalizeProfile / normalizePreferences (src/lib/normalize.ts).
 */

const UPSERT_PROFILE = `INSERT INTO profile (id, data_json, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = CURRENT_TIMESTAMP`;

const UPSERT_PREFERENCES = `INSERT INTO preferences (id, data_json, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = CURRENT_TIMESTAMP`;

/** The saved profile, or null if none saved yet. Unparseable JSON → normalizeProfile(null). */
export async function getProfile(db: SQLiteDatabase): Promise<CandidateProfile | null> {
  const row = await db.getFirstAsync<{ data_json: string }>('SELECT data_json FROM profile WHERE id = 1');
  if (!row || typeof row.data_json !== 'string') return null;
  try {
    return normalizeProfile(JSON.parse(row.data_json) as unknown);
  } catch {
    return normalizeProfile(null);
  }
}

/** Upserts row 1 with JSON.stringify(normalizeProfile(profile)) and updated_at = CURRENT_TIMESTAMP. */
export async function saveProfile(db: SQLiteDatabase, profile: CandidateProfile): Promise<void> {
  await db.runAsync(UPSERT_PROFILE, [JSON.stringify(normalizeProfile(profile))]);
}

/** The saved preferences, or DEFAULT_PREFERENCES when none saved. */
export async function getPreferences(db: SQLiteDatabase): Promise<JobPreferences> {
  const row = await db.getFirstAsync<{ data_json: string }>('SELECT data_json FROM preferences WHERE id = 1');
  if (!row || typeof row.data_json !== 'string') return DEFAULT_PREFERENCES;
  try {
    return normalizePreferences(JSON.parse(row.data_json) as unknown);
  } catch {
    return normalizePreferences(null);
  }
}

/** Upserts row 1 with normalized preferences. */
export async function savePreferences(db: SQLiteDatabase, preferences: JobPreferences): Promise<void> {
  await db.runAsync(UPSERT_PREFERENCES, [JSON.stringify(normalizePreferences(preferences))]);
}
