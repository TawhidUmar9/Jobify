import type { SQLiteDatabase } from 'expo-sqlite';

import type { Result } from '../../lib/result';
import type { SavedAnswer } from '../../types/domain';

export type AnswerWriteError = 'EMPTY' | 'TOO_LONG' | 'DB_ERROR';

/** All answers ordered by use_count DESC, updated_at DESC. */
export async function listAnswers(db: SQLiteDatabase): Promise<SavedAnswer[]> {
  // TODO(T-009): implement.
  void db;
  return [];
}

/**
 * Inserts, or updates the existing row whose question matches case-insensitively after trimming
 * and collapsing whitespace. question 1–300 chars, answer 1–4000 chars (EMPTY / TOO_LONG).
 * updated_at = CURRENT_TIMESTAMP.
 */
export async function upsertAnswer(
  db: SQLiteDatabase,
  input: { question: string; answer: string },
): Promise<Result<SavedAnswer, AnswerWriteError>> {
  // TODO(T-009): implement.
  void db;
  void input;
  return { ok: false, error: 'DB_ERROR' };
}

export async function updateAnswer(
  db: SQLiteDatabase,
  id: number,
  input: { question: string; answer: string },
): Promise<Result<SavedAnswer, AnswerWriteError>> {
  // TODO(T-009): implement.
  void db;
  void id;
  void input;
  return { ok: false, error: 'DB_ERROR' };
}

export async function deleteAnswer(db: SQLiteDatabase, id: number): Promise<void> {
  // TODO(T-009): implement.
  void db;
  void id;
}

/** use_count += 1 for each id (one statement with IN (…)). Used after a fill with ANSWER_BANK mappings. */
export async function incrementAnswerUse(db: SQLiteDatabase, ids: readonly number[]): Promise<void> {
  // TODO(T-033): implement.
  void db;
  void ids;
}
