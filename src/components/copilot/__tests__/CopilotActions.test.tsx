import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { CopilotActions } from '../CopilotActions';

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  const Icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return { Zap: Icon, FileDown: Icon, BookmarkPlus: Icon, BookmarkCheck: Icon };
});

const safeMetrics = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

describe('CopilotActions', () => {
  it('logs until the application is logged, then disables the button', async () => {
    const onLog = jest.fn();
    const view = await render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <ThemeProvider>
          <CopilotActions
            canAutoFill={false}
            filling={false}
            staging={false}
            logged={false}
            logging={false}
            onAutoFill={jest.fn()}
            onStageResume={jest.fn()}
            onLogApplication={onLog}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    const log = screen.getByTestId(TestIds.copilot.logApplication);
    expect(log.props.accessibilityLabel).toBe('Log application to Tracker');
    await fireEvent.press(log);
    expect(onLog).toHaveBeenCalled();
    await view.rerender(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <ThemeProvider>
          <CopilotActions
            canAutoFill={false}
            filling={false}
            staging={false}
            logged
            logging={false}
            onAutoFill={jest.fn()}
            onStageResume={jest.fn()}
            onLogApplication={onLog}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    const logged = screen.getByTestId(TestIds.copilot.logApplication);
    expect(logged.props.accessibilityLabel).toBe('Application already logged');
    expect(logged.props.accessibilityState).toEqual({ disabled: true, busy: false });
    expect(screen.getByText('Logged')).toBeTruthy();
  });

  it('disables all buttons when disabled is true (D-008)', async () => {
    await render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <ThemeProvider>
          <CopilotActions
            canAutoFill
            filling={false}
            staging={false}
            logged={false}
            logging={false}
            disabled
            onAutoFill={jest.fn()}
            onStageResume={jest.fn()}
            onLogApplication={jest.fn()}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByTestId(TestIds.copilot.autoFill).props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });
    expect(screen.getByTestId(TestIds.copilot.stageResume).props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });
    expect(screen.getByTestId(TestIds.copilot.logApplication).props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });
  });
});
