import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import AiSettingsScreen from '../ai';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
}));

const mockShow = jest.fn();
jest.mock('../../../components/ui/Snackbar', () => ({
  useSnackbar: () => ({ show: (msg: string) => mockShow(msg) }),
}));

const mockSave = jest.fn();
const mockRemove = jest.fn();
const mockTest = jest.fn();
let mockHasSaved = false;
const mockDefaultConfig = {
  provider: 'gemini' as const,
  model: 'gemini-3.8-flash',
  baseUrl: 'https://generativelanguage.googleapis.com',
};

jest.mock('../../../features/settings/useAiSettings', () => ({
  useAiSettings: () => ({
    status: 'ready',
    draft: { config: mockDefaultConfig, apiKey: 'test-key' },
    setDraft: jest.fn(),
    testState: { status: 'idle' },
    test: mockTest,
    save: mockSave,
    remove: mockRemove,
    errors: {},
    hasSaved: mockHasSaved,
  }),
  aiSettingsFieldErrors: () => ({}),
}));

describe('AiSettingsScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockShow.mockClear();
    mockSave.mockClear();
    mockRemove.mockClear();
    mockHasSaved = false;
  });

  it('saves settings and navigates back with snackbar', async () => {
    mockSave.mockResolvedValueOnce(true);

    await render(
      <ThemeProvider>
        <AiSettingsScreen />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId(TestIds.aiForm.save));
    expect(mockSave).toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledWith('AI settings saved');
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows remove button when hasSaved is true and confirms removal', async () => {
    mockHasSaved = true;
    mockRemove.mockResolvedValueOnce(undefined);

    await render(
      <ThemeProvider>
        <AiSettingsScreen />
      </ThemeProvider>,
    );

    const removeBtn = screen.getByTestId(TestIds.aiForm.remove);
    expect(removeBtn).toBeTruthy();

    await fireEvent.press(removeBtn);
    expect(screen.getByText('Remove key and settings?')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(TestIds.confirmDialog.confirm));
    expect(mockRemove).toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });
});
