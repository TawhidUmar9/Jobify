import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import SettingsHubScreen from '../../(tabs)/settings-hub';

const mockPush = jest.fn();
const mockDb = createFakeDb();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  useFocusEffect: (callback: () => void | (() => void)) => {
    callback();
  },
}));

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb.db,
}));

let mockAiConfig: { provider: 'gemini' | 'openai_compatible'; model: string; baseUrl: string } | null = null;
jest.mock('../../../services/ai/config', () => ({
  loadAiConfig: jest.fn(async () => mockAiConfig),
}));

let mockProfile: { fullName: string } | null = null;
let mockPreferences: { workModes: string[]; targetRoles: string[] } | null = null;
jest.mock('../../../db/repositories/profileRepo', () => ({
  getProfile: jest.fn(async () => mockProfile),
  getPreferences: jest.fn(async () => mockPreferences),
}));

let mockResumesCount = 0;
jest.mock('../../../db/repositories/resumesRepo', () => ({
  listResumes: jest.fn(async () => Array.from({ length: mockResumesCount }, (_, i) => ({ id: i + 1 }))),
}));

let mockBoardsCount = 0;
jest.mock('../../../db/repositories/boardsRepo', () => ({
  listBoards: jest.fn(async () => Array.from({ length: mockBoardsCount }, (_, i) => ({ id: i + 1 }))),
}));

let mockAnswersCount = 0;
jest.mock('../../../db/repositories/answersRepo', () => ({
  listAnswers: jest.fn(async () => Array.from({ length: mockAnswersCount }, (_, i) => ({ id: i + 1 }))),
}));

describe('SettingsHubScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockAiConfig = null;
    mockProfile = null;
    mockPreferences = null;
    mockResumesCount = 0;
    mockBoardsCount = 0;
    mockAnswersCount = 0;
  });

  it('displays default "Not set up" subtitles when data is empty and pushes sub-screens on tap', async () => {
    await render(
      <ThemeProvider>
        <SettingsHubScreen />
      </ThemeProvider>,
    );

    expect(screen.getByTestId(TestIds.settings.screen)).toBeTruthy();
    expect((await screen.findAllByText('Not set up')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('0 resumes')).toBeTruthy();
    expect(screen.getByText('0 boards')).toBeTruthy();
    expect(screen.getByText('0 saved answers')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(TestIds.settings.rowAi));
    expect(mockPush).toHaveBeenCalledWith('/settings/ai');

    await fireEvent.press(screen.getByTestId(TestIds.settings.rowProfile));
    expect(mockPush).toHaveBeenCalledWith('/settings/profile');

    await fireEvent.press(screen.getByTestId(TestIds.settings.rowResumes));
    expect(mockPush).toHaveBeenCalledWith('/settings/resumes');

    await fireEvent.press(screen.getByTestId(TestIds.settings.rowPreferences));
    expect(mockPush).toHaveBeenCalledWith('/settings/preferences');

    await fireEvent.press(screen.getByTestId(TestIds.settings.rowBoards));
    expect(mockPush).toHaveBeenCalledWith('/settings/boards');

    await fireEvent.press(screen.getByTestId(TestIds.settings.rowAnswers));
    expect(mockPush).toHaveBeenCalledWith('/settings/answers');

    await fireEvent.press(screen.getByTestId(TestIds.settings.rowBackup));
    expect(mockPush).toHaveBeenCalledWith('/settings/backup');

    await fireEvent.press(screen.getByTestId(TestIds.settings.rowAbout));
    expect(mockPush).toHaveBeenCalledWith('/settings/about');
  });

  it('displays populated subtitles when data is available', async () => {
    mockAiConfig = { provider: 'gemini', model: 'gemini-3.5-flash-lite', baseUrl: 'https://generativelanguage.googleapis.com' };
    mockProfile = { fullName: 'Alex Rahman' };
    mockPreferences = { workModes: ['REMOTE'], targetRoles: ['Backend Engineer', 'Platform Engineer', 'Systems Engineer'] };
    mockResumesCount = 2;
    mockBoardsCount = 8;
    mockAnswersCount = 14;

    await render(
      <ThemeProvider>
        <SettingsHubScreen />
      </ThemeProvider>,
    );

    expect(await screen.findByText('Gemini · gemini-3.5-flash-lite')).toBeTruthy();
    expect(screen.getByText('Alex Rahman')).toBeTruthy();
    expect(screen.getByText('2 resumes')).toBeTruthy();
    expect(screen.getByText('Remote · 3 roles')).toBeTruthy();
    expect(screen.getByText('8 boards')).toBeTruthy();
    expect(screen.getByText('14 saved answers')).toBeTruthy();
  });
});
