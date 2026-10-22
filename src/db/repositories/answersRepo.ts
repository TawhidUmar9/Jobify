import type { SQLiteDatabase } from 'expo-sqlite';

import { err, ok, type Result } from '../../lib/result';
import type { SavedAnswer } from '../../types/domain';
import type { AnswerRow } from '../schema';

export type AnswerWriteError = 'EMPTY' | 'TOO_LONG' | 'DB_ERROR';

function collapseQuestion(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function mapAnswer(row: AnswerRow): SavedAnswer {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    useCount: row.use_count,
    updatedAt: row.updated_at,
  };
}

function validatePair(question: string, answer: string): Result<{ question: string; answer: string }, AnswerWriteError> {
  const collapsed = collapseQuestion(question);
  const trimmedAnswer = answer.trim();
  if (collapsed.length < 1 || trimmedAnswer.length < 1) return err('EMPTY');
  if (collapsed.length > 300 || trimmedAnswer.length > 4000) return err('TOO_LONG');
  return ok({ question: collapsed, answer: trimmedAnswer });
}

/** All answers ordered by use_count DESC, updated_at DESC. */
export async function listAnswers(db: SQLiteDatabase): Promise<SavedAnswer[]> {
  const rows = await db.getAllAsync<AnswerRow>('SELECT * FROM answers ORDER BY use_count DESC, updated_at DESC');
  return rows.map(mapAnswer);
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
  const checked = validatePair(input.question, input.answer);
  if (!checked.ok) return checked;
  try {
    const rows = await db.getAllAsync<AnswerRow>('SELECT * FROM answers');
    const key = checked.value.question.toLowerCase();
    const existing = rows.find((row) => collapseQuestion(row.question).toLowerCase() === key);
    if (existing) {
      await db.runAsync(
        'UPDATE answers SET question = ?, answer = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [checked.value.question, checked.value.answer, existing.id],
      );
      return ok({
        id: existing.id,
        question: checked.value.question,
        answer: checked.value.answer,
        useCount: existing.use_count,
        updatedAt: existing.updated_at,
      });
    }
    const result = await db.runAsync(
      'INSERT INTO answers (question, answer, use_count, updated_at) VALUES (?, ?, 0, CURRENT_TIMESTAMP)',
      [checked.value.question, checked.value.answer],
    );
    const id = result.lastInsertRowId;
    return ok({
      id,
      question: checked.value.question,
      answer: checked.value.answer,
      useCount: 0,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return err('DB_ERROR');
  }
}

/**
 * Updates question and answer on an existing row by id. Used by the edit screen.
 * Validates length (EMPTY / TOO_LONG); bumps updated_at; leaves use_count untouched.
 */
export async function updateAnswer(
  db: SQLiteDatabase,
  id: number,
  input: { question: string; answer: string },
): Promise<Result<SavedAnswer, AnswerWriteError>> {
  const checked = validatePair(input.question, input.answer);
  if (!checked.ok) return checked;
  const current = await db.getFirstAsync<AnswerRow>('SELECT * FROM answers WHERE id = ?', [id]);
  if (!current) return err('DB_ERROR');
  await db.runAsync(
    'UPDATE answers SET question = ?, answer = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [checked.value.question, checked.value.answer, id],
  );
  return ok({
    id,
    question: checked.value.question,
    answer: checked.value.answer,
    useCount: current.use_count,
    updatedAt: current.updated_at,
  });
}

export async function deleteAnswer(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM answers WHERE id = ?', [id]);
}

/** use_count += 1 for each id (one statement with IN (…)). Used after a fill with ANSWER_BANK mappings. */
export async function incrementAnswerUse(db: SQLiteDatabase, ids: readonly number[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(`UPDATE answers SET use_count = use_count + 1 WHERE id IN (${placeholders})`, ids as number[]);
}
