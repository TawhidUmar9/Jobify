import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import type { Application } from '../../../types/domain';
import ApplicationDetailScreen from '../[id]';

const mockShow = jest.fn();
jest.mock('../../../components/ui/Snackbar', () => ({
  useSnackbar: () => ({ show: (...args: unknown[]) => mockShow(...args) }),
}));

jest.mock('expo-router', () => ({
  router: {
    navigate: jest.fn(),
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: '42' }),
}));

const { router: mockRouter } = jest.requireMock('expo-router') as {
  router: {
    navigate: jest.Mock;
    back: jest.Mock;
    push: jest.Mock;
  };
};

const mockUpdate = jest.fn();
const mockRemove = jest.fn();
let mockStatus = 'ready';
let mockApplication: Application | null = null;

jest.mock('../../../features/tracker/useApplication', () => ({
  useApplication: () => ({
    status: mockStatus,
    application: mockApplication,
    update: mockUpdate,
    remove: mockRemove,
  }),
}));

const sampleApp: Application = {
  id: 42,
  companyName: 'Acme Corp',
  roleTitle: 'Senior Dev',
  boardName: 'LinkedIn',
  jobUrl: 'https://example.com/jobs/42',
  resumeId: 1,
  resumeLabel: 'Backend',
  matchScore: 92,
  eligibility: 'ELIGIBLE',
  redFlags: [],
  coverNote: 'Sample cover note',
  coldDm: 'Sample cold dm',
  status: 'APPLIED',
  statusChangedAt: '2026-10-12 00:00:00',
  followUpAt: '2026-10-25 12:00:00',
  notes: 'My initial notes',
  createdAt: '2026-10-12 00:00:00',
};

describe('ApplicationDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = 'ready';
    mockApplication = { ...sampleApp };
    mockUpdate.mockResolvedValue(true);
    mockRemove.mockResolvedValue(true);
  });

  it('renders not_found state when application is not found', async () => {
    mockStatus = 'not_found';
    mockApplication = null;

    await render(
      <ThemeProvider>
        <ApplicationDetailScreen />
      </ThemeProvider>,
    );

    expect(screen.getByTestId(TestIds.detail.notFound)).toBeTruthy();
    expect(screen.getByText('Application not found')).toBeTruthy();

    await fireEvent.press(screen.getByText('Back to Tracker'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('renders detail screen sections and copies notes/dm', async () => {
    await render(
      <ThemeProvider>
        <ApplicationDetailScreen />
      </ThemeProvider>,
    );

    expect(screen.getByTestId(TestIds.detail.company)).toBeTruthy();
    expect(screen.getByText('Acme Corp')).toBeTruthy();
    expect(screen.getByText('Senior Dev')).toBeTruthy();
    expect(screen.getByTestId(TestIds.copilot.eligibilityBadge)).toBeTruthy();
    expect(screen.queryByTestId(TestIds.copilot.eligibilityReason)).toBeNull();
    expect(screen.getByText('Sample cover note')).toBeTruthy();
    expect(screen.getByText('Sample cold dm')).toBeTruthy();

    // Copy cover note
    await fireEvent.press(screen.getByTestId(TestIds.detail.copyCoverNote));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('Sample cover note');
    expect(mockShow).toHaveBeenCalledWith('Copied');

    // Copy cold dm
    await fireEvent.press(screen.getByTestId(TestIds.detail.copyDm));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('Sample cold dm');
    expect(mockShow).toHaveBeenCalledWith('Copied');
  });

  it('edits notes and enables save button', async () => {
    await render(
      <ThemeProvider>
        <ApplicationDetailScreen />
      </ThemeProvider>,
    );

    const notesInput = screen.getByTestId(TestIds.detail.notes);
    await fireEvent.changeText(notesInput, 'Updated notes content');

    const saveButton = screen.getByTestId(TestIds.detail.saveNotes);
    await fireEvent.press(saveButton);

    expect(mockUpdate).toHaveBeenCalledWith({ notes: 'Updated notes content' });
    expect(mockShow).toHaveBeenCalledWith('Notes saved');
  });

  it('opens StatusPicker and changes status', async () => {
    await render(
      <ThemeProvider>
        <ApplicationDetailScreen />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId(TestIds.detail.changeStatus));
    expect(screen.getByTestId(TestIds.statusPicker.sheet)).toBeTruthy();

    await fireEvent.press(screen.getByTestId(TestIds.statusPicker.option('INTERVIEWING')));
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'INTERVIEWING' });
    expect(mockShow).toHaveBeenCalledWith('Status changed to Interviewing');
  });

  it('opens FollowUpPicker and changes reminder', async () => {
    await render(
      <ThemeProvider>
        <ApplicationDetailScreen />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId(TestIds.detail.followUp));
    expect(screen.getByText('Follow-up reminder')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(TestIds.detail.followUpOption('1w')));
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledWith('Reminder updated');
  });

  it('opens job post navigating to root with url param', async () => {
    await render(
      <ThemeProvider>
        <ApplicationDetailScreen />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId(TestIds.detail.openJob));
    expect(mockRouter.navigate).toHaveBeenCalledWith({
      pathname: '/',
      params: { url: 'https://example.com/jobs/42' },
    });
  });

  it('deletes application after confirming with dialog', async () => {
    await render(
      <ThemeProvider>
        <ApplicationDetailScreen />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId(TestIds.detail.delete));
    expect(screen.getByTestId(TestIds.confirmDialog.dialog)).toBeTruthy();

    await fireEvent.press(screen.getByTestId(TestIds.confirmDialog.confirm));
    await waitFor(() => expect(mockRemove).toHaveBeenCalled());
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledWith('Application deleted');
  });
});
