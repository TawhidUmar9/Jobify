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
  // TODO(T-023): load/select/reload. TODO(T-025): openUrl. TODO(T-045): recordVisit + restore.
  return {
    status: 'loading',
    boards: [],
    activeBoard: null,
    targetUrl: '',
    contextKey: 0,
    selectBoard: () => {},
    openUrl: () => {},
    recordVisit: () => {},
    reload: () => {},
  };
}
