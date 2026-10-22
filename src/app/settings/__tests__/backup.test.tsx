import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SnackbarProvider } from '../../../components/ui/Snackbar';
import { TestIds } from '../../../constants/testIds';
import { exportBackup, importBackup } from '../../../services/backup';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import BackupSettingsScreen from '../backup';

const mockDb = createFakeDb();

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb.db,
}));

jest.mock('../../../services/backup', () => ({
  exportBackup: jest.fn(),
  importBackup: jest.fn(),
}));

const safeMetrics = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={safeMetrics}>
      <ThemeProvider>
        <SnackbarProvider>
          <BackupSettingsScreen />
        </SnackbarProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('BackupSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders export and import cards', async () => {
    await renderScreen();
    expect(screen.getByTestId(TestIds.backup.screen)).toBeTruthy();
    expect(screen.getByTestId(TestIds.backup.export)).toBeTruthy();
    expect(screen.getByTestId(TestIds.backup.import)).toBeTruthy();
    expect(
      screen.getByText(
        'Export a JSON file with your profile, resumes (text), boards, answers and applications. Your API key and resume PDFs are not included. The file is not encrypted — store it safely.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Replaces everything on this device.')).toBeTruthy();
  });

  it('handles export action and error feedback', async () => {
    jest.mocked(exportBackup).mockResolvedValueOnce({
      ok: false,
      error: 'SHARE_UNAVAILABLE',
    });

    await renderScreen();
    await fireEvent.press(screen.getByTestId(TestIds.backup.export));

    expect(exportBackup).toHaveBeenCalledWith(mockDb.db);
    await waitFor(() => {
      expect(screen.getByText('Sharing is not available on this device.')).toBeTruthy();
    });
  });

  it('opens confirm dialog on import and updates result line on success', async () => {
    jest.mocked(importBackup).mockResolvedValueOnce({
      ok: true,
      value: { resumes: 2, boards: 8, answers: 14, applications: 37 },
    });

    await renderScreen();
    await fireEvent.press(screen.getByTestId(TestIds.backup.import));

    expect(screen.getByTestId(TestIds.confirmDialog.dialog)).toBeTruthy();
    expect(
      screen.getByText('This replaces all profile, resumes, boards, answers and applications on this device with the backup file.'),
    ).toBeTruthy();

    const confirm = screen.getByTestId(TestIds.confirmDialog.confirm);
    await act(async () => {
      await fireEvent.press(confirm);
    });

    await waitFor(() => expect(importBackup).toHaveBeenCalledWith(mockDb.db));
    const resultNode = screen.getByTestId(TestIds.backup.result);
    expect(resultNode.props.children).toBe(
      'Imported 2 resumes, 8 boards, 14 answers, 37 applications',
    );
  });

  it('displays import error message on failure', async () => {
    jest.mocked(importBackup).mockResolvedValueOnce({
      ok: false,
      error: 'UNREADABLE',
    });

    await renderScreen();
    await fireEvent.press(screen.getByTestId(TestIds.backup.import));

    const confirm = screen.getByTestId(TestIds.confirmDialog.confirm);
    await act(async () => {
      await fireEvent.press(confirm);
    });

    await waitFor(() => expect(importBackup).toHaveBeenCalledWith(mockDb.db));
    const resultNode = screen.getByTestId(TestIds.backup.result);
    expect(resultNode.props.children).toBe('This file could not be read.');
  });
});
