import { useReducer, useRef, type RefObject } from 'react';

import type { WebViewHandle } from '../../components/workspace/PortalWebView';
import type { FieldMapping, JobBoard, Resume } from '../../types/domain';
import { initialWorkspaceState, workspaceReducer, type WorkspaceState } from './workspaceReducer';

export interface WorkspaceControllerParams {
  /** Board selected in the bar; null for a shared/typed link opened with no board active. */
  activeBoard: JobBoard | null;
  /** Latest URL from PortalWebView.onNavStateChange. */
  currentUrl: string;
  /** Increments whenever useBoards opens a new context (board switch, shared link). */
  contextKey: number;
}

export interface WorkspaceController {
  state: WorkspaceState;
  webViewRef: RefObject<WebViewHandle | null>;
  /** currentUrl === state.session?.sourceUrl. */
  isOnSourcePage: boolean;
  /** Resume matching analysis.recommendedResumeId (loaded from SQLite), or null. */
  recommendedResume: Resume | null;
  /** True when no AI provider is configured (FAB shows "Set up AI" instead). */
  aiMissing: boolean;
  staging: boolean;
  logging: boolean;
  stagingExplainerVisible: boolean;
  onStagingExplainerContinue: () => void;
  onStagingExplainerCancel: () => void;
  onBridgeMessage: (raw: string) => void;
  onAnalyzePress: () => void;
  reanalyze: () => void;
  autoFill: () => void;
  tailor: () => void;
  saveAnswer: (mapping: FieldMapping) => Promise<void>;
  logApplication: () => Promise<void>;
  stageRecommendedResume: () => Promise<void>;
  copyText: (text: string) => Promise<void>;
  closeSheet: () => void;
}

/**
 * Orchestrates scrape → analyze → fill / tailor / save answer / log / stage.
 * CONTRACT: ARCHITECTURE.md §7.3. Exact behaviour:
 * - On mount and on focus: load AI config + key (loadAiConfig, getApiKey) → createProvider;
 *   aiMissing = provider === null.
 * - onAnalyzePress: aiMissing → router.push('/settings/ai'). Else if phase 'ready', sheet closed and
 *   isOnSourcePage → SHEET_OPENED. Else reanalyze().
 * - reanalyze: ANALYZE_REQUESTED; injectJavaScript(SCRAPE_PAGE_JS); BRIDGE_TIMEOUT_MS timer →
 *   SCRAPE_FAILED TIMEOUT. Haptics Light.
 * - onBridgeMessage: parseBridgeMessage; ignore errors and messages not expected in the current
 *   phase (PAGE_SCRAPED/SCRAPE_ERROR only while scraping; AUTOFILL_* only while filling).
 *   PAGE_SCRAPED → SCRAPE_SUCCEEDED; if long enough: load profile (getProfile; null → PROFILE_MISSING),
 *   preferences, resumes, answers; analyzeJob(provider, …, today=new Date()) with an AbortController →
 *   ANALYSIS_SUCCEEDED {analysis, sourceUrl: message.url, boardName: activeBoard?.name ?? 'Shared link',
 *   scrapedInputCount, pageText} or ANALYSIS_FAILED (Haptics Error).
 *   AUTOFILL_COMPLETE → FILL_COMPLETED + snackbar `Filled X of Y fields` + Haptics Success +
 *   incrementAnswerUse for ANSWER_BANK mappings that were filled (match answers by question text).
 *   AUTOFILL_ERROR → FILL_FAILED + snackbar "Auto-fill failed on this page".
 * - autoFill: only phase 'ready' && isOnSourcePage && mappings > 0 → FILL_REQUESTED,
 *   inject buildAutoFillScript(mappings), timer → FILL_FAILED.
 * - tailor: TAILOR_REQUESTED → tailorApplication(provider, {profile, resume: recommendedResume,
 *   analysis, pageText}) → TAILOR_SUCCEEDED / TAILOR_FAILED. If already logged, attachTailorText.
 * - saveAnswer(mapping): upsertAnswer({question: mapping.fieldLabel, answer: mapping.value}) → ok:
 *   ANSWER_SAVED + snackbar "Saved to answer bank"; err: snackbar "Could not save answer".
 * - logApplication: insertApplication with fields per ARCHITECTURE §7.3 table → APPLICATION_LOGGED +
 *   snackbar "Logged to Tracker" | "Already in Tracker" | "Could not save. Try again."
 * - stageRecommendedResume: no recommendedResume → snackbar "Add a resume in Settings first".
 *   Android first use → explainer (KV stagingExplainerSeen); then stageResume(resume,
 *   tailor ready ? coverNote : '') with snackbars per UI_DIRECTIVES §6.
 * - copyText: Clipboard.setStringAsync + snackbar "Copied".
 * - closeSheet: abort in-flight AI calls, clear timers, SHEET_CLOSED.
 * - contextKey change: abort, clear timers, CONTEXT_CHANGED. Unmount: abort and clear timers.
 */
export function useWorkspaceController(params: WorkspaceControllerParams): WorkspaceController {
  // TODO(T-027): scrape/analyze/close/context. TODO(T-030): log. TODO(T-033): fill + saveAnswer.
  // TODO(T-034): tailor + copyText. TODO(T-036): stage.
  const [state] = useReducer(workspaceReducer, initialWorkspaceState);
  const webViewRef = useRef<WebViewHandle | null>(null);
  void params;
  const noop = () => {};
  const asyncNoop = async () => {};
  return {
    state,
    webViewRef,
    isOnSourcePage: false,
    recommendedResume: null,
    aiMissing: true,
    staging: false,
    logging: false,
    stagingExplainerVisible: false,
    onStagingExplainerContinue: noop,
    onStagingExplainerCancel: noop,
    onBridgeMessage: noop,
    onAnalyzePress: noop,
    reanalyze: noop,
    autoFill: noop,
    tailor: noop,
    saveAnswer: asyncNoop,
    logApplication: asyncNoop,
    stageRecommendedResume: asyncNoop,
    copyText: asyncNoop,
    closeSheet: noop,
  };
}
