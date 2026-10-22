import { renderHook, waitFor } from '@testing-library/react-native';

import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { getInsights } from '../../../db/repositories/insightsRepo';
import type { InsightsSummary } from '../../../types/domain';
import { useInsights } from '../useInsights';

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

jest.mock('../../../db/repositories/insightsRepo', () => ({
  getInsights: jest.fn(),
}));

const sampleSummary: InsightsSummary = {
  total: 42,
  applied: 40,
  responses: 8,
  interviews: 4,
  byStatus: { SAVED: 2, APPLIED: 28, INTERVIEWING: 4, OFFER: 1, REJECTED: 5, WITHDRAWN: 2 },
  byResume: [{ key: 'Backend', applied: 30, responses: 6, interviews: 3 }],
  byBoard: [{ key: 'LinkedIn', applied: 40, responses: 8, interviews: 4 }],
  appliedPerWeek: [{ weekStart: '2026-10-12', count: 5 }],
};

describe('useInsights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads insights on mount and sets ready status', async () => {
    (getInsights as jest.Mock).mockResolvedValueOnce(sampleSummary);
    const hook = await renderHook(() => useInsights());
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.summary).toEqual(sampleSummary);
  });

  it('sets error status when getInsights throws', async () => {
    (getInsights as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
    const hook = await renderHook(() => useInsights());
    await waitFor(() => expect(hook.result.current.status).toBe('error'));
    expect(hook.result.current.summary).toBeNull();
  });
});
