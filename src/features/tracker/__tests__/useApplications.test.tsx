import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import type { ApplicationRow } from '../../../db/schema';
import { useApplications } from '../useApplications';

const mockDb = createFakeDb();
let refocus: () => void = () => {};

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb.db,
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    useFocusEffect: (effect: () => void) => {
      refocus = effect;
      React.useEffect(() => {
        effect();
      }, [effect]);
    },
  };
});

function row(id: number, role: string, followUpAt: string | null = '2026-10-01 08:00:00'): ApplicationRow {
  return {
    id,
    company_name: 'Acme Cloud',
    role_title: role,
    board_name: 'LinkedIn',
    job_url: `https://example.com/job/${id}`,
    resume_id: null,
    resume_label: '',
    match_score: 92,
    eligibility: 'ELIGIBLE',
    red_flags_json: '[]',
    cover_note: null,
    cold_dm: null,
    notes: '',
    status: 'APPLIED',
    follow_up_at: followUpAt,
    created_at: '2026-10-04 08:00:00',
    status_changed_at: '2026-10-04 08:00:00',
  };
}

describe('useApplications', () => {
  beforeEach(() => {
    mockDb.calls.length = 0;
  });

  it('loads applications and follow-ups due at the current time', async () => {
    mockDb.queue('getAllAsync', [row(1, 'Backend engineer')]);
    mockDb.queue('getAllAsync', [row(1, 'Backend engineer')]);
    const hook = await renderHook(() => useApplications());
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.applications.map((item) => item.roleTitle)).toEqual(['Backend engineer']);
    expect(hook.result.current.followUpsDue).toHaveLength(1);
    const followUpCall = mockDb.calls.filter((call) => call.sql.includes('follow_up_at'));
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    expect(String(followUpCall[0]?.params[0]).slice(0, 16)).toBe(now);
    await act(async () => {
      hook.unmount();
    });
  });

  it('keeps the current lists visible when focus reloads', async () => {
    mockDb.queue('getAllAsync', [row(1, 'Backend engineer')]);
    mockDb.queue('getAllAsync', [row(1, 'Backend engineer')]);
    const hook = await renderHook(() => useApplications());
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));

    let release: (rows: ApplicationRow[]) => void = () => {};
    mockDb.queue(
      'getAllAsync',
      new Promise<ApplicationRow[]>((resolve) => {
        release = resolve;
      }),
    );
    mockDb.queue('getAllAsync', [row(2, 'Staff engineer')]);
    await act(async () => {
      refocus();
    });
    expect(hook.result.current.status).toBe('ready');
    expect(hook.result.current.applications[0]?.roleTitle).toBe('Backend engineer');

    await act(async () => {
      release([row(2, 'Staff engineer')]);
    });
    await waitFor(() => expect(hook.result.current.applications[0]?.roleTitle).toBe('Staff engineer'));
    expect(hook.result.current.followUpsDue[0]?.id).toBe(2);
    await act(async () => {
      hook.unmount();
    });
  });

  it('sets refreshing around a pull-to-refresh and reports a database error', async () => {
    mockDb.queue('getAllAsync', [row(1, 'Backend engineer')]);
    mockDb.queue('getAllAsync', []);
    const hook = await renderHook(() => useApplications());
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));

    let release: (rows: ApplicationRow[]) => void = () => {};
    mockDb.queue(
      'getAllAsync',
      new Promise<ApplicationRow[]>((resolve) => {
        release = resolve;
      }),
    );
    mockDb.queue('getAllAsync', []);
    await act(async () => {
      hook.result.current.refresh();
    });
    expect(hook.result.current.refreshing).toBe(true);
    await act(async () => {
      release([row(3, 'Refreshed')]);
    });
    await waitFor(() => expect(hook.result.current.refreshing).toBe(false));
    expect(hook.result.current.applications[0]?.roleTitle).toBe('Refreshed');

    mockDb.fail('getAllAsync');
    await act(async () => {
      hook.result.current.refresh();
    });
    await waitFor(() => expect(hook.result.current.status).toBe('error'));
    expect(hook.result.current.refreshing).toBe(false);
    await act(async () => {
      hook.unmount();
    });
  });
});
