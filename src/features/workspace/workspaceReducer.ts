import { SCRAPE_LIMITS, type PageScrapedMessage } from '../../bridge/messages';
import type { AiErrorCode } from '../../services/ai/types';
import type { AnalysisSession, TailorResult } from '../../types/domain';

/**
 * Workspace copilot state machine. CONTRACT FILE: transition table in ARCHITECTURE.md §7.2.
 * Pure reducer. useWorkspaceController performs side effects and dispatches these actions.
 */

export type WorkspacePhase = 'idle' | 'scraping' | 'analyzing' | 'ready' | 'filling' | 'error';

export type WorkspaceError =
  | { kind: 'SCRAPE'; code: 'TIMEOUT' | 'SCRIPT_ERROR' }
  | { kind: 'NO_CONTENT' }
  | { kind: 'NO_PROFILE' }
  | { kind: 'AI'; code: AiErrorCode };

export interface FillSummary {
  filledCount: number;
  missingCount: number;
}

export type TailorState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; result: TailorResult }
  | { status: 'error'; code: AiErrorCode };

export interface WorkspaceState {
  phase: WorkspacePhase;
  sheetOpen: boolean;
  session: AnalysisSession | null;
  error: WorkspaceError | null;
  lastFill: FillSummary | null;
  /** Set after "Log" succeeds for the current session. */
  loggedApplicationId: number | null;
  tailor: TailorState;
  /** clawIds of GENERATED mappings already saved to the answer bank this session. */
  savedAnswerClawIds: string[];
}

export type WorkspaceAction =
  | { type: 'ANALYZE_REQUESTED' }
  | { type: 'SCRAPE_SUCCEEDED'; message: PageScrapedMessage }
  | { type: 'SCRAPE_FAILED'; code: 'TIMEOUT' | 'SCRIPT_ERROR' }
  | { type: 'PROFILE_MISSING' }
  | { type: 'ANALYSIS_SUCCEEDED'; session: AnalysisSession }
  | { type: 'ANALYSIS_FAILED'; code: AiErrorCode }
  | { type: 'FILL_REQUESTED' }
  | { type: 'FILL_COMPLETED'; filledCount: number; missingCount: number }
  | { type: 'FILL_FAILED' }
  | { type: 'TAILOR_REQUESTED' }
  | { type: 'TAILOR_SUCCEEDED'; result: TailorResult }
  | { type: 'TAILOR_FAILED'; code: AiErrorCode }
  | { type: 'ANSWER_SAVED'; clawId: string }
  | { type: 'APPLICATION_LOGGED'; applicationId: number }
  | { type: 'SHEET_OPENED' }
  | { type: 'SHEET_CLOSED' }
  | { type: 'CONTEXT_CHANGED' };

export const initialWorkspaceState: WorkspaceState = {
  phase: 'idle',
  sheetOpen: false,
  session: null,
  error: null,
  lastFill: null,
  loggedApplicationId: null,
  tailor: { status: 'idle' },
  savedAnswerClawIds: [],
};

/** ms the controller waits for PAGE_SCRAPED / AUTOFILL_COMPLETE before failing. */
export const BRIDGE_TIMEOUT_MS = 5000;

/**
 * Transition rules. Any action not listed for the current phase returns `state` unchanged
 * (same object reference).
 *
 * ANALYZE_REQUESTED   idle|ready|error → scraping; sheetOpen=true; session=null; error=null;
 *                     lastFill=null; loggedApplicationId=null; tailor={idle}; savedAnswerClawIds=[].
 * SCRAPE_SUCCEEDED    scraping → message.pageText.length < SCRAPE_LIMITS.minPageTextChars ?
 *                     (error {NO_CONTENT}, phase 'error') : phase 'analyzing'.
 * SCRAPE_FAILED       scraping → error {SCRAPE, code}, phase 'error'.
 * PROFILE_MISSING     analyzing → error {NO_PROFILE}, phase 'error'.
 * ANALYSIS_SUCCEEDED  analyzing → ready; session = action.session.
 * ANALYSIS_FAILED     analyzing → error {AI, code}, phase 'error'.
 * FILL_REQUESTED      ready AND session.analysis.fieldMappings.length > 0 → filling.
 * FILL_COMPLETED      filling → ready; lastFill = {filledCount, missingCount}.
 * FILL_FAILED         filling → ready; lastFill = {0, session.analysis.fieldMappings.length}.
 * TAILOR_REQUESTED    ready|filling AND tailor.status ≠ 'loading' → tailor = {loading}.
 * TAILOR_SUCCEEDED    tailor.status 'loading' → tailor = {ready, result}.
 * TAILOR_FAILED       tailor.status 'loading' → tailor = {error, code}.
 * ANSWER_SAVED        ready|filling → append clawId to savedAnswerClawIds if absent.
 * APPLICATION_LOGGED  ready|filling → loggedApplicationId = applicationId.
 * SHEET_OPENED        ready|error → sheetOpen=true.
 * SHEET_CLOSED        any → sheetOpen=false; scraping|analyzing → phase 'idle';
 *                     error → phase 'idle', error=null; ready|filling keep everything
 *                     (tailor 'loading' becomes {idle}: the controller aborts it).
 * CONTEXT_CHANGED     any → initialWorkspaceState (board switched or a shared link opened).
 */
function resetForAnalyze(): WorkspaceState {
  return {
    phase: 'scraping',
    sheetOpen: true,
    session: null,
    error: null,
    lastFill: null,
    loggedApplicationId: null,
    tailor: { status: 'idle' },
    savedAnswerClawIds: [],
  };
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'ANALYZE_REQUESTED':
      if (state.phase !== 'idle' && state.phase !== 'ready' && state.phase !== 'error') return state;
      return resetForAnalyze();
    case 'SCRAPE_SUCCEEDED':
      if (state.phase !== 'scraping') return state;
      if (action.message.pageText.length < SCRAPE_LIMITS.minPageTextChars) {
        return { ...state, phase: 'error', error: { kind: 'NO_CONTENT' } };
      }
      return { ...state, phase: 'analyzing' };
    case 'SCRAPE_FAILED':
      if (state.phase !== 'scraping') return state;
      return { ...state, phase: 'error', error: { kind: 'SCRAPE', code: action.code } };
    case 'PROFILE_MISSING':
      if (state.phase !== 'analyzing') return state;
      return { ...state, phase: 'error', error: { kind: 'NO_PROFILE' } };
    case 'ANALYSIS_SUCCEEDED':
      if (state.phase !== 'analyzing') return state;
      return { ...state, phase: 'ready', session: action.session };
    case 'ANALYSIS_FAILED':
      if (state.phase !== 'analyzing') return state;
      return { ...state, phase: 'error', error: { kind: 'AI', code: action.code } };
    case 'FILL_REQUESTED':
      if (state.phase !== 'ready' || state.session === null || state.session.analysis.fieldMappings.length === 0) {
        return state;
      }
      return { ...state, phase: 'filling' };
    case 'FILL_COMPLETED':
      if (state.phase !== 'filling') return state;
      return {
        ...state,
        phase: 'ready',
        lastFill: { filledCount: action.filledCount, missingCount: action.missingCount },
      };
    case 'FILL_FAILED':
      if (state.phase !== 'filling' || state.session === null) return state;
      return {
        ...state,
        phase: 'ready',
        lastFill: { filledCount: 0, missingCount: state.session.analysis.fieldMappings.length },
      };
    case 'TAILOR_REQUESTED':
      if ((state.phase !== 'ready' && state.phase !== 'filling') || state.tailor.status === 'loading') return state;
      return { ...state, tailor: { status: 'loading' } };
    case 'TAILOR_SUCCEEDED':
      if (state.tailor.status !== 'loading') return state;
      return { ...state, tailor: { status: 'ready', result: action.result } };
    case 'TAILOR_FAILED':
      if (state.tailor.status !== 'loading') return state;
      return { ...state, tailor: { status: 'error', code: action.code } };
    case 'ANSWER_SAVED':
      if ((state.phase !== 'ready' && state.phase !== 'filling') || state.savedAnswerClawIds.includes(action.clawId)) {
        return state;
      }
      return { ...state, savedAnswerClawIds: [...state.savedAnswerClawIds, action.clawId] };
    case 'APPLICATION_LOGGED':
      if (state.phase !== 'ready' && state.phase !== 'filling') return state;
      return { ...state, loggedApplicationId: action.applicationId };
    case 'SHEET_OPENED':
      if ((state.phase !== 'ready' && state.phase !== 'error') || state.sheetOpen) return state;
      return { ...state, sheetOpen: true };
    case 'SHEET_CLOSED':
      return closeSheet(state);
    case 'CONTEXT_CHANGED':
      return state === initialWorkspaceState ? state : initialWorkspaceState;
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}

function closeSheet(state: WorkspaceState): WorkspaceState {
  const phase =
    state.phase === 'scraping' || state.phase === 'analyzing' || state.phase === 'error' ? 'idle' : state.phase;
  const error = state.phase === 'error' ? null : state.error;
  const tailor =
    (state.phase === 'ready' || state.phase === 'filling') && state.tailor.status === 'loading'
      ? { status: 'idle' as const }
      : state.tailor;
  if (!state.sheetOpen && phase === state.phase && error === state.error && tailor === state.tailor) return state;
  return { ...state, sheetOpen: false, phase, error, tailor };
}
