import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import type { Application } from '../../../types/domain';
import TrackerScreen from '../tracker';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockState: {
  status: 'loading' | 'ready' | 'error';
  applications: Application[];
  followUpsDue: Application[];
  refreshing: boolean;
  refresh: () => void;
} = {
  status: 'loading',
  applications: [],
  followUpsDue: [],
  refreshing: false,
  refresh: mockRefresh,
};

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  function icon(name: string) {
    function Icon(props: Record<string, unknown>) {
      return React.createElement(Text, props, name);
    }
    Icon.displayName = name;
    return Icon;
  }
  return {
    ChartColumn: icon('ChartColumn'),
    BellRing: icon('BellRing'),
    CircleCheck: icon('CircleCheck'),
    CircleHelp: icon('CircleHelp'),
    CircleX: icon('CircleX'),
  };
});

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    router: { push: (...args: unknown[]) => mockPush(...args) },
    Stack: {
      Screen: ({ options }: { options?: { headerRight?: () => React.ReactNode } }) =>
        React.createElement(View, null, options?.headerRight?.()),
    },
  };
});

jest.mock('../../../features/tracker/useApplications', () => ({
  useApplications: () => mockState,
}));

function application(): Application {
  return {
    id: 7,
    companyName: 'Acme Cloud',
    roleTitle: 'Backend engineer',
    boardName: 'LinkedIn',
    jobUrl: 'https://example.com/job',
    resumeId: null,
    resumeLabel: '',
    matchScore: 92,
    eligibility: 'ELIGIBLE',
    redFlags: [],
    coverNote: null,
    coldDm: null,
    notes: '',
    status: 'APPLIED',
    followUpAt: null,
    createdAt: '2026-10-12 08:00:00',
    statusChangedAt: '2026-10-12 08:00:00',
  };
}

function screenTree() {
  return render(
    <ThemeProvider>
      <TrackerScreen />
    </ThemeProvider>,
  );
}

describe('TrackerScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockState.status = 'loading';
    mockState.applications = [];
    mockState.followUpsDue = [];
    mockState.refreshing = false;
  });

  it('shows loading, then an error that retries', async () => {
    const view = await screenTree();
    expect(screen.getByText('Loading applications…')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Insights'));
    expect(mockPush).toHaveBeenCalledWith('/insights');

    mockState.status = 'error';
    await view.rerender(
      <ThemeProvider>
        <TrackerScreen />
      </ThemeProvider>,
    );
    expect(screen.getByText('Could not load applications')).toBeTruthy();
    expect(screen.getByText('The local database did not respond.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(TestIds.tracker.retry));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('offers Workspace when the tracker is empty and lists rows when it is not', async () => {
    mockState.status = 'ready';
    const view = await screenTree();
    expect(screen.getByText('No applications yet')).toBeTruthy();
    expect(screen.getByText('Analyze a job page in Workspace and tap Log to track it here.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Go to Workspace'));
    expect(mockPush).toHaveBeenCalledWith('/');

    const item = application();
    mockState.applications = [item];
    mockState.followUpsDue = [item];
    await view.rerender(
      <ThemeProvider>
        <TrackerScreen />
      </ThemeProvider>,
    );
    expect(screen.getByTestId(TestIds.tracker.list)).toBeTruthy();
    expect(screen.getByText('Follow-ups due (1)')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(TestIds.tracker.row(7)));
    expect(mockPush).toHaveBeenCalledWith('/application/7');
    const refreshControl = screen.getByTestId(TestIds.tracker.list).props.refreshControl as {
      props: { onRefresh: () => void; refreshing: boolean };
    };
    refreshControl.props.onRefresh();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
