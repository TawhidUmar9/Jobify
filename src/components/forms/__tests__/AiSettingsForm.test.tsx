import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { TestIds } from '../../../constants/testIds';
import { AI_DEFAULTS, AI_ERROR_MESSAGES } from '../../../services/ai/types';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { AiSettingsForm, type AiSettingsDraft } from '../AiSettingsForm';

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  const Icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return { Eye: Icon, EyeOff: Icon, CircleCheck: Icon };
});

async function renderForm(draft: AiSettingsDraft, testState: AiSettingsFormPropsTest = { status: 'idle' }) {
  const onChange = jest.fn();
  const onTest = jest.fn();
  const view = await render(
    <ThemeProvider>
      <AiSettingsForm draft={draft} onChange={onChange} onTest={onTest} testState={testState} />
    </ThemeProvider>,
  );
  return { onChange, onTest, ...view };
}

type AiSettingsFormPropsTest = { status: 'idle' | 'testing' | 'ok' } | { status: 'error'; message: string };

describe('AiSettingsForm', () => {
  const geminiDraft: AiSettingsDraft = { config: AI_DEFAULTS.gemini, apiKey: 'secret-key' };

  it('resets model and base URL when the provider changes and keeps the key', async () => {
    const { onChange } = await renderForm(geminiDraft);
    await fireEvent.press(screen.getByTestId(TestIds.aiForm.providerOpenAi));
    expect(onChange).toHaveBeenCalledWith({
      apiKey: 'secret-key',
      config: AI_DEFAULTS.openai_compatible,
    });
  });

  it('keeps the API key secure until Show key is pressed', async () => {
    await renderForm(geminiDraft);
    const input = screen.getByLabelText('API key');
    expect(input.props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByLabelText('Show key'));
    expect(screen.getByLabelText('API key').props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByLabelText('Hide key'));
    expect(screen.getByLabelText('API key').props.secureTextEntry).toBe(true);
  });

  it('hides the Gemini base URL until Advanced, and always shows it for OpenAI-compatible', async () => {
    const view = await renderForm(geminiDraft);
    expect(screen.queryByTestId(TestIds.aiForm.baseUrl)).toBeNull();
    await fireEvent.press(screen.getByTestId(TestIds.aiForm.advancedToggle));
    expect(screen.getByTestId(TestIds.aiForm.baseUrl)).toBeTruthy();

    await view.rerender(
      <ThemeProvider>
        <AiSettingsForm
          draft={{ config: { ...AI_DEFAULTS.openai_compatible, model: 'llama3.1' }, apiKey: 'secret-key' }}
          onChange={jest.fn()}
          onTest={jest.fn()}
          testState={{ status: 'idle' }}
        />
      </ThemeProvider>,
    );
    expect(screen.getByTestId(TestIds.aiForm.baseUrl)).toBeTruthy();
    expect(screen.getByText('Optional for local servers')).toBeTruthy();
    expect(screen.queryByTestId(TestIds.aiForm.advancedToggle)).toBeNull();
  });

  it('opens the Gemini key page and shows Connected or the error copy', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const { onTest } = await renderForm(geminiDraft, { status: 'ok' });
    await fireEvent.press(screen.getByTestId(TestIds.aiForm.getKeyLink));
    expect(openURL).toHaveBeenCalledWith('https://aistudio.google.com/apikey');
    expect(screen.getByTestId(TestIds.aiForm.testResult)).toBeTruthy();
    expect(screen.getByText('Connected')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(TestIds.aiForm.test));
    expect(onTest).toHaveBeenCalledTimes(1);
    openURL.mockRestore();

    await renderForm(geminiDraft, { status: 'error', message: AI_ERROR_MESSAGES.AUTH });
    expect(screen.getByText(AI_ERROR_MESSAGES.AUTH)).toBeTruthy();
  });

  it('shows field errors for an empty model and a non-http base URL', async () => {
    await renderForm({
      config: { provider: 'openai_compatible', model: '', baseUrl: 'ftp://files.example' },
      apiKey: '',
    });
    expect(screen.getByText('Enter a model name')).toBeTruthy();
    expect(screen.getByText('Enter a full http(s) address')).toBeTruthy();
  });
});
