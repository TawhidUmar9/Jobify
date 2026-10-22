import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import type { SavedAnswer } from '../../../types/domain';
import AnswersSettingsScreen from '../answers';

const mockDb = createFakeDb();

jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    cb();
  },
}));

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb.db,
}));

const mockShow = jest.fn();
jest.mock('../../../components/ui/Snackbar', () => ({
  useSnackbar: () => ({ show: (msg: string) => mockShow(msg) }),
}));

let mockAnswers: SavedAnswer[] = [];
const mockUpsertAnswer = jest.fn();
const mockUpdateAnswer = jest.fn();
const mockDeleteAnswer = jest.fn();

jest.mock('../../../db/repositories/answersRepo', () => ({
  listAnswers: jest.fn(async () => mockAnswers),
  upsertAnswer: (...args: unknown[]) => mockUpsertAnswer(...args),
  updateAnswer: (...args: unknown[]) => mockUpdateAnswer(...args),
  deleteAnswer: (...args: unknown[]) => mockDeleteAnswer(...args),
}));

describe('AnswersSettingsScreen', () => {
  const sampleAnswer: SavedAnswer = {
    id: 1,
    question: 'What is your notice period?',
    answer: 'Two weeks.',
    useCount: 3,
    updatedAt: '2026-10-21 12:00:00',
  };

  beforeEach(() => {
    mockShow.mockClear();
    mockUpsertAnswer.mockClear();
    mockUpdateAnswer.mockClear();
    mockDeleteAnswer.mockClear();
    mockAnswers = [];
  });

  it('renders empty state copy when there are no saved answers', async () => {
    await render(
      <ThemeProvider>
        <AnswersSettingsScreen />
      </ThemeProvider>,
    );

    expect(await screen.findByText('No saved answers')).toBeTruthy();
    expect(
      screen.getByText('Save AI drafts from the copilot, or add answers you reuse, like notice period or salary expectations.'),
    ).toBeTruthy();
    expect(screen.getByTestId(TestIds.answers.add)).toBeTruthy();
  });

  it('renders answer list with question, answer, and use count', async () => {
    mockAnswers = [sampleAnswer];

    await render(
      <ThemeProvider>
        <AnswersSettingsScreen />
      </ThemeProvider>,
    );

    expect(await screen.findByText('What is your notice period?')).toBeTruthy();
    expect(screen.getByText('Two weeks.')).toBeTruthy();
    expect(screen.getByText('Used 3 times')).toBeTruthy();
  });

  it('deletes an answer after confirmation', async () => {
    mockAnswers = [sampleAnswer];
    mockDeleteAnswer.mockResolvedValueOnce(undefined);

    await render(
      <ThemeProvider>
        <AnswersSettingsScreen />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId(TestIds.answers.delete(1)));
    expect(screen.getByText('Delete answer?')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(TestIds.confirmDialog.confirm));
    expect(mockDeleteAnswer).toHaveBeenCalledWith(mockDb.db, 1);
    expect(mockShow).toHaveBeenCalledWith('Answer deleted');
  });

  it('adds an answer via form', async () => {
    mockAnswers = [sampleAnswer];
    mockUpsertAnswer.mockResolvedValueOnce({
      ok: true,
      value: { id: 2, question: 'Salary expectation', answer: '$120k', useCount: 0 },
    });

    await render(
      <ThemeProvider>
        <AnswersSettingsScreen />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId(TestIds.answers.add));
    expect(screen.getAllByText('Add answer').length).toBeGreaterThanOrEqual(1);

    await fireEvent.changeText(screen.getByTestId(TestIds.answers.formQuestion), 'Salary expectation');
    await fireEvent.changeText(screen.getByTestId(TestIds.answers.formAnswer), '$120k');
    await fireEvent.press(screen.getByTestId(TestIds.answers.formSave));

    expect(mockUpsertAnswer).toHaveBeenCalledWith(mockDb.db, {
      question: 'Salary expectation',
      answer: '$120k',
    });
    expect(mockShow).toHaveBeenCalledWith('Answer saved');
  });

  it('edits an answer on tap', async () => {
    mockAnswers = [sampleAnswer];
    mockUpdateAnswer.mockResolvedValueOnce({
      ok: true,
      value: { ...sampleAnswer, answer: '1 month.' },
    });

    await render(
      <ThemeProvider>
        <AnswersSettingsScreen />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId(TestIds.answers.row(1)));
    expect(screen.getByText('Edit answer')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId(TestIds.answers.formAnswer), '1 month.');
    await fireEvent.press(screen.getByTestId(TestIds.answers.formSave));

    expect(mockUpdateAnswer).toHaveBeenCalledWith(mockDb.db, 1, {
      question: 'What is your notice period?',
      answer: '1 month.',
    });
    expect(mockShow).toHaveBeenCalledWith('Answer saved');
  });
});
