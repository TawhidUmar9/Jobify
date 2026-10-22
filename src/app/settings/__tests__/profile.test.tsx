import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import type { CandidateProfile } from '../../../types/domain';
import ProfileSettingsScreen from '../profile';

const mockBack = jest.fn();
let beforeRemoveCallback: ((e: { preventDefault: () => void; data: { action: unknown } }) => void) | null = null;

jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useNavigation: () => ({
    addListener: (event: string, cb: (e: { preventDefault: () => void; data: { action: unknown } }) => void) => {
      if (event === 'beforeRemove') {
        beforeRemoveCallback = cb;
      }
      return () => {
        beforeRemoveCallback = null;
      };
    },
    dispatch: jest.fn(),
  }),
}));

const mockShow = jest.fn();
jest.mock('../../../components/ui/Snackbar', () => ({
  useSnackbar: () => ({ show: (msg: string) => mockShow(msg) }),
}));

const mockSaveProfile = jest.fn();
const sampleProfile: CandidateProfile = {
  fullName: 'Alex Rahman',
  email: 'alex@example.com',
  phone: '+8801700000000',
  location: 'Dhaka, Bangladesh',
  countryCode: 'BD',
  timeZone: 'Asia/Dhaka',
  headline: 'Backend Engineer',
  summary: '3 years experience building APIs.',
  links: [],
  skills: ['TypeScript', 'Node.js'],
  experience: [],
  education: [],
  extraFacts: [],
};

jest.mock('../../../features/settings/useProfileData', () => ({
  useProfileData: () => ({
    status: 'ready',
    profile: sampleProfile,
    preferences: { workModes: ['REMOTE'], targetRoles: [] },
    saveProfile: mockSaveProfile,
    savePreferences: jest.fn(),
  }),
}));

describe('ProfileSettingsScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockShow.mockClear();
    mockSaveProfile.mockClear();
    beforeRemoveCallback = null;
  });

  it('renders profile and saves successfully', async () => {
    mockSaveProfile.mockResolvedValueOnce(true);

    await render(
      <ThemeProvider>
        <ProfileSettingsScreen />
      </ThemeProvider>,
    );

    const nameInput = screen.getByTestId(TestIds.profileForm.fullName);
    expect(nameInput.props.value).toBe('Alex Rahman');

    await fireEvent.changeText(nameInput, 'Alex Rahman Updated');
    await fireEvent.press(screen.getByTestId(TestIds.profileForm.save));

    expect(mockSaveProfile).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Alex Rahman Updated' }),
    );
    expect(mockShow).toHaveBeenCalledWith('Profile saved');
    expect(mockBack).toHaveBeenCalled();
  });

  it('prompts to discard changes when navigating back with unsaved changes', async () => {
    await render(
      <ThemeProvider>
        <ProfileSettingsScreen />
      </ThemeProvider>,
    );

    const nameInput = screen.getByTestId(TestIds.profileForm.fullName);
    await fireEvent.changeText(nameInput, 'Changed Name');

    // Trigger beforeRemove event
    let prevented = false;
    await act(async () => {
      beforeRemoveCallback?.({
        preventDefault: () => {
          prevented = true;
        },
        data: { action: {} },
      });
    });

    expect(prevented).toBe(true);
    expect(await screen.findByText('Discard changes?')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(TestIds.confirmDialog.confirm));
    expect(screen.queryByText('Discard changes?')).toBeNull();
  });
});
