import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';

import { listBoards } from '../../db/repositories/boardsRepo';
import { KV_KEYS, kvGet, kvSet } from '../../services/kvStore';
import type { JobBoard } from '../../types/domain';

export interface BoardsState {
  status: 'loading' | 'ready' | 'error';
  boards: JobBoard[];
  /** null while loading, when there are no boards, or after openUrl (shared/typed link). */
  activeBoard: JobBoard | null;
  /** URL the WebView should load; '' when nothing to show. */
  targetUrl: string;
  /** Increments on selectBoard and openUrl; the controller resets its state when it changes. */
  contextKey: number;
  /** Loads board.lastVisitedUrl ?? board.url (re-selecting the active board loads board.url).
   *  Persists KV_KEYS.activeBoardId. */
  selectBoard: (board: JobBoard) => void;
  /** Opens any http(s) URL (address bar, share intent, deep link); sets activeBoard = null. */
  openUrl: (url: string) => void;
  /** Debounced (1000 ms) write of last_visited_url for the active board (T-045). */
  recordVisit: (url: string) => void;
  /** Re-reads boards (after Settings → Job boards changes; called on Workspace focus). */
  reload: () => void;
}

function boardUrl(board: JobBoard, retap: boolean): string {
  if (retap) return board.url;
  return board.lastVisitedUrl ?? board.url;
}

/**
 * Board list + active board. CONTRACT: ARCHITECTURE.md §7.1.
 * - Mount: listBoards(db); activeBoard = board with id === Number(kvGet(activeBoardId)) else boards[0]
 *   else null; targetUrl from it (lastVisitedUrl from T-045 on; before that use url).
 * - Focus (useFocusEffect): reload(); if the active board was deleted, fall back to boards[0].
 * - DB error → status 'error'.
 * - recordVisit: ignore non-http(s), activeBoard null, or hostname different from
 *   new URL(activeBoard.url).hostname; debounce 1000 ms; updateLastVisitedUrl.
 */
export function useBoards(): BoardsState {
  const db = useSQLiteContext();
  const [status, setStatus] = useState<BoardsState['status']>('loading');
  const [boards, setBoards] = useState<JobBoard[]>([]);
  const [activeBoard, setActiveBoard] = useState<JobBoard | null>(null);
  const [targetUrl, setTargetUrl] = useState('');
  const [contextKey, setContextKey] = useState(0);
  const activeIdRef = useRef<number | null>(null);
  const activeUrlRef = useRef<string>('');

  const load = useCallback(async () => {
    try {
      const list = await listBoards(db);
      let preferred = activeIdRef.current;
      if (preferred === null) {
        const raw = await kvGet(KV_KEYS.activeBoardId);
        if (raw !== null && raw.trim() !== '' && Number.isFinite(Number(raw))) preferred = Number(raw);
      }
      const next = (preferred === null ? undefined : list.find((board) => board.id === preferred)) ?? list[0] ?? null;
      const previousId = activeIdRef.current;
      const previousUrl = activeUrlRef.current;
      setBoards(list);
      setActiveBoard(next);
      activeIdRef.current = next?.id ?? null;
      activeUrlRef.current = next?.url ?? '';
      if (!next) {
        setTargetUrl('');
      } else if (previousId !== next.id || previousUrl !== next.url || previousId === null) {
        setTargetUrl(next.url);
        await kvSet(KV_KEYS.activeBoardId, String(next.id));
      }
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const selectBoard = useCallback((board: JobBoard) => {
    const retap = activeIdRef.current === board.id;
    setActiveBoard(board);
    activeIdRef.current = board.id;
    activeUrlRef.current = board.url;
    setTargetUrl(boardUrl(board, retap));
    setContextKey((current) => current + 1);
    void kvSet(KV_KEYS.activeBoardId, String(board.id));
  }, []);

  // TODO(T-025): openUrl.
  const openUrl = useCallback((_url: string) => {
    void _url;
  }, []);

  // TODO(T-045): recordVisit + restore.
  const recordVisit = useCallback((_url: string) => {
    void _url;
  }, []);

  return {
    status,
    boards,
    activeBoard,
    targetUrl,
    contextKey,
    selectBoard,
    openUrl,
    recordVisit,
    reload: () => {
      void load();
    },
  };
}
