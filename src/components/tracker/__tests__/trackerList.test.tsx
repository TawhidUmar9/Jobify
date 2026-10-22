import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { lightColors } from '../../../theme/tokens';
import type { Application } from '../../../types/domain';
import { ApplicationRow } from '../ApplicationRow';
import { FollowUpsSection } from '../FollowUpsSection';
import { StatusChip } from '../StatusChip';

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
    BellRing: icon('BellRing'),
    CircleCheck: icon('CircleCheck'),
    CircleHelp: icon('CircleHelp'),
    CircleX: icon('CircleX'),
  };
});

function application(overrides: Partial<Application> = {}): Application {
  return {
    id: 1,
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
    ...overrides,
  };
}

function flatten(style: unknown): Record<string, unknown> {
  return (StyleSheet.flatten(style as never) as Record<string, unknown> | undefined) ?? {};
}

describe('StatusChip', () => {
  it('paints each status in its tone', async () => {
    await render(
      <ThemeProvider>
        <StatusChip status="SAVED" testID="saved" />
        <StatusChip status="APPLIED" testID="applied" />
        <StatusChip status="INTERVIEWING" testID="interviewing" />
        <StatusChip status="OFFER" testID="offer" />
        <StatusChip status="REJECTED" testID="rejected" />
        <StatusChip status="WITHDRAWN" testID="withdrawn" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('saved')).toHaveTextContent('Saved');
    expect(flatten(screen.getByTestId('saved').props.style).backgroundColor).toBe(lightColors.surfaceMuted);
    expect(flatten(screen.getByTestId('applied').props.style).borderColor).toBe(lightColors.primary);
    expect(flatten(screen.getByTestId('interviewing').props.style).backgroundColor).toBe(lightColors.warningBg);
    expect(flatten(screen.getByTestId('offer').props.style).backgroundColor).toBe(lightColors.successBg);
    expect(flatten(screen.getByTestId('rejected').props.style).backgroundColor).toBe(lightColors.dangerBg);
    expect(flatten(screen.getByTestId('withdrawn').props.style).backgroundColor).toBe(lightColors.surfaceMuted);
    expect(flatten(screen.getByTestId('applied').props.style).height).toBe(24);
  });
});

describe('ApplicationRow', () => {
  it('formats the stored date, match, eligibility, and a due follow-up', async () => {
    const onPress = jest.fn();
    const item = application({ followUpAt: '2000-01-01 00:00:00' });
    await render(
      <ThemeProvider>
        <ApplicationRow application={item} onPress={onPress} />
      </ThemeProvider>,
    );
    expect(screen.getByText('Backend engineer')).toBeTruthy();
    expect(screen.getByText('Acme Cloud · LinkedIn')).toBeTruthy();
    expect(screen.getByText('12 Oct 2026 · Match 92')).toBeTruthy();
    expect(screen.getByText('CircleCheck')).toBeTruthy();
    expect(screen.getByText('· Follow up due')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Backend engineer at Acme Cloud, Applied, added 12 Oct 2026' })).toBeTruthy();
    fireEvent.press(screen.getByTestId(TestIds.tracker.row(1)));
    expect(onPress).toHaveBeenCalledWith(item);
    expect(flatten(screen.getByTestId(TestIds.tracker.row(1)).props.style).height).toBe(88);
  });

  it('omits the match and follow-up when they do not apply', async () => {
    await render(
      <ThemeProvider>
        <ApplicationRow
          application={application({ matchScore: null, eligibility: null, followUpAt: '2999-01-01 00:00:00', createdAt: '2026-10-04 08:00:00' })}
          onPress={jest.fn()}
        />
      </ThemeProvider>,
    );
    expect(screen.getByText('4 Oct 2026')).toBeTruthy();
    expect(screen.queryByText(/Match/)).toBeNull();
    expect(screen.queryByText(/Follow up due/)).toBeNull();
    expect(screen.queryByText('CircleCheck')).toBeNull();
  });
});

describe('FollowUpsSection', () => {
  it('hides itself when nothing is due', async () => {
    await render(
      <ThemeProvider>
        <FollowUpsSection due={[]} onOpen={jest.fn()} />
      </ThemeProvider>,
    );
    expect(screen.queryByTestId(TestIds.tracker.followUpsSection)).toBeNull();
  });

  it('shows five rows, an applied-ago caption, and the remainder', async () => {
    const now = new Date();
    const created = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 8, 8, 0, 0);
    const stamp = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')} 08:00:00`;
    const due = [1, 2, 3, 4, 5, 6].map((id) => application({ id, roleTitle: `Role ${id}`, createdAt: stamp }));
    const onOpen = jest.fn();
    await render(
      <ThemeProvider>
        <FollowUpsSection due={due} onOpen={onOpen} />
      </ThemeProvider>,
    );
    expect(screen.getByText('Follow-ups due (6)')).toBeTruthy();
    expect(screen.getByText('BellRing')).toBeTruthy();
    expect(screen.getByText('Role 1 · Acme Cloud')).toBeTruthy();
    expect(screen.getAllByText('Applied 8 days ago')).toHaveLength(5);
    expect(screen.queryByTestId(TestIds.tracker.followUpRow(6))).toBeNull();
    expect(screen.getByText('+1 more below')).toBeTruthy();
    fireEvent.press(screen.getByTestId(TestIds.tracker.followUpRow(1)));
    expect(onOpen).toHaveBeenCalledWith(due[0]);
  });
});
