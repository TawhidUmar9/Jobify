import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import type { AnswerRow } from '../../schema';
import { incrementAnswerUse, listAnswers, updateAnswer, upsertAnswer } from '../answersRepo';

function answer(partial: Partial<AnswerRow> & Pick<AnswerRow, 'id' | 'question'>): AnswerRow {
  return {
    answer: 'Thirty days.',
    use_count: 4,
    updated_at: '2026-10-01 00:00:00',
    ...partial,
  };
}

describe('answersRepo', () => {
  it('updates a case-insensitive whitespace-collapsed question and keeps use_count', async () => {
    const fake = createFakeDb();
    fake.queue('getAllAsync', [answer({ id: 2, question: 'what is your notice period?' })]);
    const result = await upsertAnswer(fake.db, {
      question: 'What is your  notice period?',
      answer: '  Two weeks.  ',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(2);
      expect(result.value.question).toBe('What is your notice period?');
      expect(result.value.answer).toBe('Two weeks.');
      expect(result.value.useCount).toBe(4);
    }
    const update = fake.calls.find((call) => call.method === 'runAsync');
    expect(update?.sql).toContain('updated_at = CURRENT_TIMESTAMP');
    expect(update?.sql).not.toContain('use_count');
  });

  it('returns EMPTY before TOO_LONG and TOO_LONG past the limits', async () => {
    const empty = await upsertAnswer(createFakeDb().db, { question: '   ', answer: 'x'.repeat(4001) });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error).toBe('EMPTY');

    const longQuestion = await upsertAnswer(createFakeDb().db, { question: 'q'.repeat(301), answer: 'ok' });
    expect(longQuestion.ok).toBe(false);
    if (!longQuestion.ok) expect(longQuestion.error).toBe('TOO_LONG');

    const longAnswer = await updateAnswer(createFakeDb().db, 1, { question: 'Notice?', answer: 'a'.repeat(4001) });
    expect(longAnswer.ok).toBe(false);
    if (!longAnswer.ok) expect(longAnswer.error).toBe('TOO_LONG');
  });

  it('lists by use_count then updated_at', async () => {
    const fake = createFakeDb();
    await listAnswers(fake.db);
    expect(fake.calls[0]?.sql).toContain('ORDER BY use_count DESC, updated_at DESC');
  });

  it('increments use_count for multiple ids in one statement, or does nothing when empty', async () => {
    const fake = createFakeDb();
    await incrementAnswerUse(fake.db, []);
    expect(fake.calls).toHaveLength(0);

    await incrementAnswerUse(fake.db, [1, 3]);
    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0]?.sql).toBe('UPDATE answers SET use_count = use_count + 1 WHERE id IN (?, ?)');
    expect(fake.calls[0]?.params).toEqual([1, 3]);
  });
});
