import { act, renderHook, waitFor } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { KV_KEYS } from '../../../services/kvStore';
import type { JobBoard } from '../../../types/domain';
import { useBoards } from '../useBoards';

const mockDb = createFakeDb();

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb.db,
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    useFocusEffect: (effect: () => void) => {
      React.useEffect(() => {
        effect();
      }, [effect]);
    },
  };
});

function board(id: number, name: string, sortOrder: number, lastVisitedUrl: string | null = null): JobBoard {
  return { id, name, url: `https://${name.toLowerCase()}.example`, lastVisitedUrl, sortOrder };
}

function row(boardItem: JobBoard) {
  return {
    id: boardItem.id,
    name: boardItem.name,
    url: boardItem.url,
    last_visited_url: boardItem.lastVisitedUrl,
    sort_order: boardItem.sortOrder,
  };
}

describe('useBoards', () => {
  const linkedIn = board(1, 'LinkedIn', 0);
  const wellfound = board(4, 'Wellfound', 1, 'https://wellfound.example/jobs');

  beforeEach(async () => {
    mockDb.calls.length = 0;
    await Storage.removeItem(KV_KEYS.activeBoardId);
  });

  it('selects the first board on a fresh launch and keeps a later choice across a relaunch', async () => {
    mockDb.queue('getAllAsync', [row(linkedIn), row(wellfound)]);
    const first = await renderHook(() => useBoards());
    await waitFor(() => expect(first.result.current.status).toBe('ready'));
    expect(first.result.current.activeBoard?.name).toBe('LinkedIn');
    expect(first.result.current.targetUrl).toBe(linkedIn.url);
    expect(await Storage.getItem(KV_KEYS.activeBoardId)).toBe('1');

    await act(async () => {
      first.result.current.selectBoard(wellfound);
    });
    expect(first.result.current.activeBoard?.id).toBe(4);
    expect(first.result.current.targetUrl).toBe('https://wellfound.example/jobs');
    expect(await Storage.getItem(KV_KEYS.activeBoardId)).toBe('4');

    await act(async () => {
      first.result.current.selectBoard(wellfound);
    });
    expect(first.result.current.targetUrl).toBe(wellfound.url);

    await act(async () => {
      first.unmount();
    });
    mockDb.queue('getAllAsync', [row(linkedIn), row(wellfound)]);
    const second = await renderHook(() => useBoards());
    await waitFor(() => {
      expect(second.result.current.status).toBe('ready');
      expect(second.result.current.activeBoard?.id).toBe(4);
    });
    await act(async () => {
      second.unmount();
    });
  });

  it('falls back to the first board when focus reload drops the active one', async () => {
    mockDb.queue('getAllAsync', [row(linkedIn), row(wellfound)]);
    const { result } = await renderHook(() => useBoards());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      result.current.selectBoard(wellfound);
    });
    mockDb.queue('getAllAsync', [row(linkedIn)]);
    await act(async () => {
      result.current.reload();
    });
    await waitFor(() => expect(result.current.activeBoard?.id).toBe(1));
    expect(result.current.boards).toHaveLength(1);
    expect(await Storage.getItem(KV_KEYS.activeBoardId)).toBe('1');
  });

  it('reports an error when the database throws', async () => {
    mockDb.fail('getAllAsync');
    const { result } = await renderHook(() => useBoards());
    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
