import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import type { Resume } from '../../../types/domain';
import ResumeEditScreen from '../resume/[id]';

const mockBack = jest.fn();
let mockParamsId = '1';

jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useLocalSearchParams: () => ({ id: mockParamsId }),
}));

const mockDb = createFakeDb();
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb.db,
}));

const mockShow = jest.fn();
jest.mock('../../../components/ui/Snackbar', () => ({
  useSnackbar: () => ({ show: (msg: string) => mockShow(msg) }),
}));

const mockGetResume = jest.fn();
const mockUpdateResume = jest.fn();
jest.mock('../../../db/repositories/resumesRepo', () => ({
  getResume: (...args: unknown[]) => mockGetResume(...args),
  updateResume: (...args: unknown[]) => mockUpdateResume(...args),
}));

describe('ResumeEditScreen', () => {
  const sampleResume: Resume = {
    id: 1,
    label: 'Backend',
    fileName: 'Alex_Rahman_Backend.pdf',
    fileUri: 'file://docs/resumes/1.pdf',
    content: {
      summary: 'Experienced dev',
      skills: ['TypeScript'],
      highlights: ['Big win'],
    },
    createdAt: '2026-10-20 10:00:00',
  };

  beforeEach(() => {
    mockBack.mockClear();
    mockShow.mockClear();
    mockGetResume.mockClear();
    mockUpdateResume.mockClear();
    mockParamsId = '1';
  });

  it('renders not_found for invalid or missing id', async () => {
    mockParamsId = 'abc';

    await render(
      <ThemeProvider>
        <ResumeEditScreen />
      </ThemeProvider>,
    );

    expect(await screen.findByText('Resume not found')).toBeTruthy();
  });

  it('loads resume and saves updates', async () => {
    mockGetResume.mockResolvedValueOnce(sampleResume);
    mockUpdateResume.mockResolvedValueOnce({ ok: true, value: sampleResume });

    await render(
      <ThemeProvider>
        <ResumeEditScreen />
      </ThemeProvider>,
    );

    const labelInput = await screen.findByTestId(TestIds.resumeImport.label);
    expect(labelInput.props.value).toBe('Backend');

    await fireEvent.changeText(labelInput, 'Backend Lead');
    await fireEvent.press(screen.getByTestId(TestIds.resumes.editSave));

    expect(mockUpdateResume).toHaveBeenCalledWith(
      mockDb.db,
      1,
      expect.objectContaining({ label: 'Backend Lead' }),
    );
    expect(mockShow).toHaveBeenCalledWith('Resume saved');
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows error on duplicate label', async () => {
    mockGetResume.mockResolvedValueOnce(sampleResume);
    mockUpdateResume.mockResolvedValueOnce({ ok: false, error: 'DUPLICATE_LABEL' });

    await render(
      <ThemeProvider>
        <ResumeEditScreen />
      </ThemeProvider>,
    );

    const labelInput = await screen.findByTestId(TestIds.resumeImport.label);
    await fireEvent.changeText(labelInput, 'Existing');
    await fireEvent.press(screen.getByTestId(TestIds.resumes.editSave));

    expect(await screen.findByText('A resume with this name exists')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
