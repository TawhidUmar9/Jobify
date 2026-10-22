import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import type { ApplicationRow } from '../../../db/schema';
import { useApplication } from '../useApplication';

const mockDb = createFakeDb();

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb.db,
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(() => effect(), [effect]);
    },
  };
});

function stored(partial: Partial<ApplicationRow> = {}): ApplicationRow {
  return {
    id: 5,
    company_name: 'Northwind',
    role_title: 'Backend engineer',
    board_name: 'Wellfound',
    job_url: 'https://example.com/jobs/1',
    resume_id: 1,
    resume_label: 'Main',
    match_score: 100,
    eligibility: 'ELIGIBLE',
    red_flags_json: '[]',
    cover_note: null,
    cold_dm: null,
    notes: '',
    status: 'APPLIED',
    follow_up_at: '2026-10-29 00:00:00',
    created_at: '2026-10-22 00:00:00',
    status_changed_at: '2026-10-22 00:00:00',
    ...partial,
  };
}

describe('useApplication', () => {
  beforeEach(() => {
    mockDb.calls.length = 0;
  });

  it('returns not_found without db call for non-integer or <= 0 id', async () => {
    for (const badId of ['abc', '0', '-1']) {
      const hook = await renderHook(() => useApplication(badId));
      expect(hook.result.current.status).toBe('not_found');
      expect(hook.result.current.application).toBeNull();
      expect(mockDb.calls.length).toBe(0);
    }
  });

  it('returns not_found when getApplication returns null for 999', async () => {
    mockDb.queue('getFirstAsync', null);
    const hook = await renderHook(() => useApplication('999'));
    await waitFor(() => expect(hook.result.current.status).toBe('not_found'));
    expect(hook.result.current.application).toBeNull();
  });

  it('returns ready with application data when found, and allows update and remove', async () => {
    mockDb.queue('getFirstAsync', stored({ id: 5 }));
    const hook = await renderHook(() => useApplication('5'));
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.application?.companyName).toBe('Northwind');

    // Update
    mockDb.queue('getFirstAsync', stored({ id: 5 })); // for getApplication in patch
    mockDb.queue('runAsync', { changes: 1 });
    mockDb.queue('getFirstAsync', stored({ id: 5, notes: 'Saved note' })); // updated
    let updateOk = false;
    await act(async () => {
      updateOk = await hook.result.current.update({ notes: 'Saved note' });
    });
    expect(updateOk).toBe(true);
    expect(hook.result.current.application?.notes).toBe('Saved note');

    // Remove
    mockDb.queue('runAsync', { changes: 1 });
    let removeOk = false;
    await act(async () => {
      removeOk = await hook.result.current.remove();
    });
    expect(removeOk).toBe(true);
  });
});
