import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import WorkspaceScreen from '../index';

const mockDb = createFakeDb();
const mockPush = jest.fn();
const mockSetParams = jest.fn();
let mockParams: { url?: string } = {};

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb.db,
}));

jest.mock('../../../components/copilot/CopilotSheet', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    CopilotSheet: () => React.createElement(View, { testID: 'copilot-sheet-stub' }),
  };
});

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    router: {
      push: (...args: unknown[]) => mockPush(...args),
      setParams: (...args: unknown[]) => mockSetParams(...args),
    },
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (effect: () => void) => {
      React.useEffect(() => {
        effect();
      }, [effect]);
    },
  };
});

const safeMetrics = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

async function renderWorkspace() {
  return render(
    <SafeAreaProvider initialMetrics={safeMetrics}>
      <ThemeProvider>
        <WorkspaceScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('WorkspaceScreen', () => {
  beforeEach(() => {
    mockDb.calls.length = 0;
    mockPush.mockClear();
    mockSetParams.mockClear();
    mockParams = {};
  });

  it('shows a loading message while boards are being read', async () => {
    mockDb.queue('getAllAsync', new Promise(() => undefined));
    await renderWorkspace();
    expect(screen.getByText('Loading job boards…')).toBeTruthy();
  });

  it('shows an error and retries', async () => {
    mockDb.fail('getAllAsync');
    await renderWorkspace();
    expect(await screen.findByText('Could not load job boards')).toBeTruthy();
    expect(screen.getByText('The local database did not open. Try again.')).toBeTruthy();
    mockDb.queue('getAllAsync', []);
    await fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByTestId(TestIds.workspace.emptyBoards)).toBeTruthy();
  });

  it('offers Settings when there are no boards and no link', async () => {
    mockDb.queue('getAllAsync', []);
    await renderWorkspace();
    expect(await screen.findByTestId(TestIds.workspace.emptyBoards)).toBeTruthy();
    expect(screen.getByText('No job boards')).toBeTruthy();
    expect(screen.getByText('Add one in Settings → Job boards, or tap the address bar to open a link.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Manage job boards'));
    expect(mockPush).toHaveBeenCalledWith('/settings/boards');
  });

  it('opens an http url param and ignores javascript', async () => {
    mockParams = { url: 'javascript:alert(1)' };
    mockDb.queue('getAllAsync', []);
    const view = await renderWorkspace();
    expect(await screen.findByTestId(TestIds.workspace.emptyBoards)).toBeTruthy();
    expect(screen.queryByTestId(TestIds.workspace.webview)).toBeNull();
    expect(mockSetParams).not.toHaveBeenCalled();

    mockParams = { url: 'http://10.0.2.2:8787/fixtures/job-remote-form.html' };
    view.rerender(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <ThemeProvider>
          <WorkspaceScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(await screen.findByTestId(TestIds.workspace.webview)).toBeTruthy();
    await waitFor(() =>
      expect(mockSetParams).toHaveBeenCalledWith({ url: undefined }),
    );
  });
});
