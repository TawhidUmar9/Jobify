/**
 * Local SQLite schema. CONTRACT FILE: changing it requires a new migration
 * (bump DB_VERSION, append to MIGRATIONS) and an entry in DECISIONS.md.
 * Version tracking: PRAGMA user_version. Database file: DATABASE_NAME.
 * The API key is NOT stored here (expo-secure-store, see src/services/secrets.ts).
 */

export const DATABASE_NAME = 'jobify.db';

export const DB_VERSION = 1;

export const MIGRATION_V1 = `
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data_json TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS preferences (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data_json TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resumes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL UNIQUE COLLATE NOCASE,
  file_name TEXT,
  file_uri TEXT,
  content_json TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  last_visited_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  board_name TEXT NOT NULL,
  job_url TEXT NOT NULL,
  resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
  resume_label TEXT NOT NULL DEFAULT '',
  match_score INTEGER CHECK (match_score IS NULL OR (match_score BETWEEN 0 AND 100)),
  eligibility TEXT CHECK (eligibility IS NULL OR eligibility IN ('ELIGIBLE','NOT_ELIGIBLE','UNCLEAR')),
  red_flags_json TEXT NOT NULL DEFAULT '[]',
  cover_note TEXT,
  cold_dm TEXT,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('SAVED','APPLIED','INTERVIEWING','OFFER','REJECTED','WITHDRAWN')),
  follow_up_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status_changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_job_url ON applications (job_url);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_follow_up ON applications (follow_up_at);
`;

/** MIGRATIONS[n] upgrades from user_version n to n + 1. */
export const MIGRATIONS: readonly string[] = [MIGRATION_V1];

/** Raw rows (snake_case). Repositories map them to domain types and validate enums/JSON. */
export interface ProfileRow {
  id: number;
  data_json: string;
  updated_at: string;
}

export interface PreferencesRow {
  id: number;
  data_json: string;
  updated_at: string;
}

export interface ResumeRow {
  id: number;
  label: string;
  file_name: string | null;
  file_uri: string | null;
  content_json: string;
  created_at: string;
}

export interface JobBoardRow {
  id: number;
  name: string;
  url: string;
  last_visited_url: string | null;
  sort_order: number;
}

export interface AnswerRow {
  id: number;
  question: string;
  answer: string;
  use_count: number;
  updated_at: string;
}

export interface ApplicationRow {
  id: number;
  company_name: string;
  role_title: string;
  board_name: string;
  job_url: string;
  resume_id: number | null;
  resume_label: string;
  match_score: number | null;
  eligibility: string | null;
  red_flags_json: string;
  cover_note: string | null;
  cold_dm: string | null;
  notes: string;
  status: string;
  follow_up_at: string | null;
  created_at: string;
  status_changed_at: string;
}
