import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import type { Resume } from '../../../types/domain';
import ResumesSettingsScreen from '../resumes';

const mockPush = jest.fn();
const mockDb = createFakeDb();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
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

let mockResumes: Resume[] = [];
const mockDeleteResume = jest.fn();
const mockInsertResume = jest.fn();
jest.mock('../../../db/repositories/resumesRepo', () => ({
  listResumes: jest.fn(async () => mockResumes),
  deleteResume: (...args: unknown[]) => mockDeleteResume(...args),
  insertResume: (...args: unknown[]) => mockInsertResume(...args),
}));

const mockDeleteResumePdf = jest.fn();
jest.mock('../../../services/resumeFiles', () => ({
  deleteResumePdf: (...args: unknown[]) => mockDeleteResumePdf(...args),
}));

const mockImportPdf = jest.fn();
const mockImportText = jest.fn();
const mockReset = jest.fn();
let mockImporterState = { status: 'idle' };

jest.mock('../../../features/onboarding/useResumeImport', () => ({
  useResumeImport: () => ({
    state: mockImporterState,
    pdfSupported: true,
    importPdf: mockImportPdf,
    importText: mockImportText,
    reset: mockReset,
  }),
}));

jest.mock('../../../features/settings/useAiSettings', () => ({
  useAiSettings: () => ({
    status: 'ready',
    hasSaved: true,
  }),
}));

describe('ResumesSettingsScreen', () => {
  const sampleResume: Resume = {
    id: 1,
    label: 'Backend',
    fileName: 'Alex_Rahman_Backend.pdf',
    fileUri: 'file://docs/resumes/1.pdf',
    content: {
      summary: 'Experienced backend dev',
      skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
      highlights: [],
    },
    createdAt: '2026-10-20 10:00:00',
  };

  beforeEach(() => {
    mockPush.mockClear();
    mockShow.mockClear();
    mockDeleteResume.mockClear();
    mockInsertResume.mockClear();
    mockDeleteResumePdf.mockClear();
    mockImportPdf.mockClear();
    mockImportText.mockClear();
    mockReset.mockClear();
    mockImporterState = { status: 'idle' };
    mockResumes = [];
  });

  it('renders empty state when there are no resumes', async () => {
    await render(
      <ThemeProvider>
        <ResumesSettingsScreen />
      </ThemeProvider>,
    );

    expect(await screen.findByText('No resumes yet')).toBeTruthy();
    expect(screen.getByTestId(TestIds.resumes.add)).toBeTruthy();
  });

  it('renders resume list and allows navigating to edit', async () => {
    mockResumes = [sampleResume];

    await render(
      <ThemeProvider>
        <ResumesSettingsScreen />
      </ThemeProvider>,
    );

    expect(await screen.findByText('Backend')).toBeTruthy();
    expect(screen.getByText('Alex_Rahman_Backend.pdf · 3 skills')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(TestIds.resumes.row(1)));
    expect(mockPush).toHaveBeenCalledWith('/settings/resume/1');
  });

  it('deletes a resume and removes its physical file after confirmation', async () => {
    mockResumes = [sampleResume];
    mockDeleteResume.mockResolvedValueOnce(true);
    mockDeleteResumePdf.mockResolvedValueOnce(undefined);

    await render(
      <ThemeProvider>
        <ResumesSettingsScreen />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId(TestIds.resumes.delete(1)));
    expect(screen.getByText('Delete Backend?')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(TestIds.confirmDialog.confirm));
    expect(mockDeleteResume).toHaveBeenCalledWith(mockDb.db, 1);
    expect(mockDeleteResumePdf).toHaveBeenCalledWith('file://docs/resumes/1.pdf');
    expect(mockShow).toHaveBeenCalledWith('Resume deleted');
  });

  it('opens import panel and adds a resume manually', async () => {
    mockResumes = [sampleResume];
    mockInsertResume.mockResolvedValueOnce({
      ok: true,
      value: { id: 2, label: 'Resume 2' },
    });

    await render(
      <ThemeProvider>
        <ResumesSettingsScreen />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId(TestIds.resumes.add));
    expect(screen.getAllByText('Add resume').length).toBeGreaterThanOrEqual(1);

    await fireEvent.press(screen.getByTestId(TestIds.resumeImport.manual));
    expect(mockInsertResume).toHaveBeenCalledWith(
      mockDb.db,
      expect.objectContaining({ label: 'Resume 2', fileName: null, fileUri: null }),
    );
    expect(mockShow).toHaveBeenCalledWith('Resume saved');
    expect(mockPush).toHaveBeenCalledWith('/settings/resume/2');
  });
});
