import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { SnackbarProvider } from '../../../components/ui/Snackbar';
import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import * as useBoardsModule from '../../../features/workspace/useBoards';
import WorkspaceScreen from '../index';

const mockDb = createFakeDb();
const mockPush = jest.fn();
const mockRouterSetParams = jest.fn();
const mockNavSetParams = jest.fn();
const mockOpenUrl = jest.fn();
let mockParams: { url?: string } = {};
const mockNavigation = {
  setParams: (params: { url?: string }) => {
    mockNavSetParams(params);
    mockParams = { ...mockParams, ...params };
  },
};

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  const Icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return {
    Sparkles: Icon,
    Settings2: Icon,
    RefreshCw: Icon,
    X: Icon,
    ChevronLeft: Icon,
    ChevronRight: Icon,
    RotateCw: Icon,
    BookmarkPlus: Icon,
    BookmarkCheck: Icon,
  };
});

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
      setParams: (...args: unknown[]) => mockRouterSetParams(...args),
    },
    useNavigation: () => mockNavigation,
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = effect();
        return () => {
          if (typeof cleanup === 'function') cleanup();
        };
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
        <SnackbarProvider>
          <WorkspaceScreen />
        </SnackbarProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('WorkspaceScreen', () => {
  const backListeners: Parameters<typeof BackHandler.addEventListener>[1][] = [];

  beforeEach(() => {
    mockDb.calls.length = 0;
    mockPush.mockClear();
    mockRouterSetParams.mockClear();
    mockNavSetParams.mockClear();
    mockOpenUrl.mockClear();
    mockParams = {};
    backListeners.length = 0;

    const actualUseBoards = jest.requireActual('../../../features/workspace/useBoards').useBoards;
    const React = jest.requireActual('react') as typeof import('react');
    jest.spyOn(useBoardsModule, 'useBoards').mockImplementation(() => {
      const real = actualUseBoards();
      const openUrl = React.useCallback(
        (url: string) => {
          mockOpenUrl(url);
          return real.openUrl(url);
        },
        [real.openUrl],
      );
      return React.useMemo(
        () => ({
          ...real,
          openUrl,
        }),
        [real, openUrl],
      );
    });

    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'hardwareBackPress') {
        backListeners.push(handler);
      }
      return {
        remove: () => {
          const idx = backListeners.indexOf(handler);
          if (idx !== -1) backListeners.splice(idx, 1);
        },
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    expect(mockOpenUrl).not.toHaveBeenCalled();
    expect(mockNavSetParams).not.toHaveBeenCalled();
    expect(mockRouterSetParams).not.toHaveBeenCalled();

    mockParams = { url: 'http://10.0.2.2:8787/fixtures/job-remote-form.html' };
    view.rerender(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <ThemeProvider>
          <SnackbarProvider>
            <WorkspaceScreen />
          </SnackbarProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(await screen.findByTestId(TestIds.workspace.webview)).toBeTruthy();
    expect(mockOpenUrl).toHaveBeenCalledTimes(1);
    expect(mockOpenUrl).toHaveBeenCalledWith('http://10.0.2.2:8787/fixtures/job-remote-form.html');
    await waitFor(() =>
      expect(mockNavSetParams).toHaveBeenCalledWith({ url: undefined }),
    );
    expect(mockNavSetParams).toHaveBeenCalledTimes(1);
    expect(mockRouterSetParams).not.toHaveBeenCalled();
  });

  it('handles hardware back button: default returns false when neither sheet open nor canGoBack', async () => {
    mockDb.queue('getAllAsync', []);
    await renderWorkspace();
    expect(backListeners.length).toBeGreaterThan(0);
    const lastHandler = backListeners[backListeners.length - 1];
    expect(lastHandler({} as Parameters<typeof lastHandler>[0])).toBe(false);
  });

  it('saves job for later via toolbar-save button and handles duplicate', async () => {
    mockParams = { url: 'http://10.0.2.2:8787/fixtures/job-remote-form.html' };
    mockDb.queue('getAllAsync', [
      { id: 1, name: 'Fixtures', base_url: 'http://10.0.2.2:8787/fixtures', sort_order: 0, created_at: '' },
    ]);
    // findApplicationByUrl initially returns null
    mockDb.queue('getFirstAsync', null);

    await renderWorkspace();
    expect(await screen.findByTestId(TestIds.workspace.webview)).toBeTruthy();

    // Queue for checkSaved on nav url change:
    mockDb.queue('getFirstAsync', null);

    const webview = screen.getByTestId(TestIds.workspace.webview);
    fireEvent(webview, 'navigationStateChange', {
      url: 'http://10.0.2.2:8787/fixtures/job-remote-form.html',
      title: 'Job Posting',
      loading: false,
      canGoBack: false,
      canGoForward: false,
    });

    await waitFor(() => {
      const btn = screen.getByTestId(TestIds.toolbar.save);
      expect(btn.props.accessibilityState).toEqual({ disabled: false });
    });

    // Now press save:
    // 1. handleSave calls findApplicationByUrl -> null
    // 2. insertApplication checks existing -> null
    // 3. insertApplication runs insert -> { changes: 1, lastInsertRowId: 10 }
    // 4. insertApplication getApplication -> row
    mockDb.queue('getFirstAsync', null); // findApplicationByUrl in handleSave
    mockDb.queue('getFirstAsync', null); // insertApplication precheck
    mockDb.queue('runAsync', { changes: 1, lastInsertRowId: 10 });
    mockDb.queue('getFirstAsync', {
      id: 10,
      company_name: '10.0.2.2:8787',
      role_title: 'Saved job',
      board_name: 'Fixtures',
      job_url: 'http://10.0.2.2:8787/fixtures/job-remote-form.html',
      resume_id: null,
      resume_label: '',
      match_score: null,
      eligibility: null,
      red_flags_json: '[]',
      cover_note: null,
      cold_dm: null,
      notes: '',
      status: 'SAVED',
      follow_up_at: null,
      created_at: '2026-10-23 12:00:00',
      status_changed_at: '2026-10-23 12:00:00',
    });

    const saveButton = screen.getByTestId(TestIds.toolbar.save);
    await fireEvent.press(saveButton);

    expect(await screen.findByText('Saved to Tracker')).toBeTruthy();

    // Now press again: handleSave finds existing application
    mockDb.queue('getFirstAsync', {
      id: 10,
      company_name: '10.0.2.2:8787',
      role_title: 'Saved job',
      board_name: 'Fixtures',
      job_url: 'http://10.0.2.2:8787/fixtures/job-remote-form.html',
      resume_id: null,
      resume_label: '',
      match_score: null,
      eligibility: null,
      red_flags_json: '[]',
      cover_note: null,
      cold_dm: null,
      notes: '',
      status: 'SAVED',
      follow_up_at: null,
      created_at: '2026-10-23 12:00:00',
      status_changed_at: '2026-10-23 12:00:00',
    });

    await fireEvent.press(saveButton);
    expect(await screen.findByText('Already in Tracker')).toBeTruthy();
  });
});
