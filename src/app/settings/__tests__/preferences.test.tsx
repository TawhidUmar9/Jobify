import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import type { JobPreferences } from '../../../types/domain';
import PreferencesSettingsScreen from '../preferences';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useNavigation: () => ({
    addListener: jest.fn(),
    dispatch: jest.fn(),
  }),
}));

const mockShow = jest.fn();
jest.mock('../../../components/ui/Snackbar', () => ({
  useSnackbar: () => ({ show: (msg: string) => mockShow(msg) }),
}));

const mockSavePreferences = jest.fn();
const samplePreferences: JobPreferences = {
  targetRoles: ['Backend Engineer'],
  workModes: ['REMOTE'],
  workAuthorizedCountries: ['BD'],
  openToSponsorship: false,
  minTimeZoneOverlapHours: 2,
  minSalary: null,
  salaryCurrency: 'USD',
  blockedCompanies: [],
};

jest.mock('../../../features/settings/useProfileData', () => ({
  useProfileData: () => ({
    status: 'ready',
    profile: { fullName: 'Alex' },
    preferences: samplePreferences,
    saveProfile: jest.fn(),
    savePreferences: mockSavePreferences,
  }),
}));

describe('PreferencesSettingsScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockShow.mockClear();
    mockSavePreferences.mockClear();
  });

  it('renders preferences and saves successfully', async () => {
    mockSavePreferences.mockResolvedValueOnce(true);

    await render(
      <ThemeProvider>
        <PreferencesSettingsScreen />
      </ThemeProvider>,
    );

    expect(screen.getByText('Backend Engineer')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(TestIds.preferencesForm.save));

    expect(mockSavePreferences).toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledWith('Preferences saved');
    expect(mockBack).toHaveBeenCalled();
  });
});
