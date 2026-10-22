import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useReducer, useRef, useState, type RefObject } from 'react';

import { buildAutoFillScript } from '../../bridge/autoFillScript';
import { parseBridgeMessage, SCRAPE_LIMITS, type PageScrapedMessage } from '../../bridge/messages';
import { SCRAPE_PAGE_JS } from '../../bridge/scrapePageScript';
import type { WebViewHandle } from '../../components/workspace/PortalWebView';
import { useSnackbar } from '../../components/ui/Snackbar';
import { incrementAnswerUse, listAnswers, upsertAnswer } from '../../db/repositories/answersRepo';
import { insertApplication } from '../../db/repositories/applicationsRepo';
import { getPreferences, getProfile } from '../../db/repositories/profileRepo';
import { listResumes } from '../../db/repositories/resumesRepo';
import { analyzeJob, createProvider } from '../../services/ai/aiClient';
import { loadAiConfig } from '../../services/ai/config';
import type { AiProvider } from '../../services/ai/types';
import { getApiKey } from '../../services/secrets';
import type { FieldMapping, JobBoard, Resume } from '../../types/domain';
import { BRIDGE_TIMEOUT_MS, initialWorkspaceState, workspaceReducer, type WorkspaceState } from './workspaceReducer';

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
 * Coordinates Workspace state: scraping, AI analysis, auto-fill, tailor, staging, and logging.
 *
 * Exact behaviours (T-028, T-030, T-033, T-034, T-036):
 * - Focus: reload AI config. If no provider or no key, aiMissing=true.
 * - onAnalyzePress: if aiMissing, navigate /settings/ai. If ready and sheet closed and on the
 *   same URL, SHEET_OPENED. Otherwise reanalyze().
 * - reanalyze: ANALYZE_REQUESTED (scrapes, sheet opens, timers reset), inject SCRAPE_PAGE_JS,
 *   5-second timer fires SCRAPE_FAILED TIMEOUT. Haptics Light.
 * - onBridgeMessage: parses raw string via parseBridgeMessage.
 *   PAGE_SCRAPED -> if text too short, SCRAPE_SUCCEEDED (NO_CONTENT); else phase 'analyzing',
 *   load profile/preferences/resumes/answers from SQLite, call analyzeJob -> ANALYSIS_SUCCEEDED {session:
 *   analysis, sourceUrl, boardName: activeBoard?.name ?? 'Shared link',
 *   scrapedInputCount, pageText} or ANALYSIS_FAILED (Haptics Error).
 *   AUTOFILL_COMPLETE -> FILL_COMPLETED + snackbar `Filled X of Y fields` + Haptics Success +
 *   incrementAnswerUse for ANSWER_BANK mappings that were filled (match answers by question text).
 *   AUTOFILL_ERROR -> FILL_FAILED + snackbar "Auto-fill failed on this page".
 * - autoFill: only phase 'ready' && isOnSourcePage && mappings > 0 -> FILL_REQUESTED,
 *   inject buildAutoFillScript(mappings), timer -> FILL_FAILED.
 * - tailor: TAILOR_REQUESTED -> tailorApplication(provider, {profile, resume: recommendedResume,
 *   analysis, pageText}) -> TAILOR_SUCCEEDED / TAILOR_FAILED. If already logged, attachTailorText.
 * - saveAnswer(mapping): upsertAnswer({question: mapping.fieldLabel, answer: mapping.value}) -> ok:
 *   ANSWER_SAVED + snackbar "Saved to answer bank"; err: snackbar "Could not save answer".
 * - logApplication: insertApplication with fields per ARCHITECTURE §7.3 table -> APPLICATION_LOGGED +
 *   snackbar "Logged to Tracker" | "Already in Tracker" | "Could not save. Try again."
 * - stageRecommendedResume: no recommendedResume -> snackbar "Add a resume in Settings first".
 *   Android first use -> explainer (KV stagingExplainerSeen); then stageResume(resume,
 *   tailor ready ? coverNote : '') with snackbars per UI_DIRECTIVES §6.
 * - copyText: Clipboard.setStringAsync + snackbar "Copied".
 * - closeSheet: abort in-flight AI calls, clear timers, SHEET_CLOSED.
 * - contextKey change: abort, clear timers, CONTEXT_CHANGED. Unmount: abort and clear timers.
 */
export function useWorkspaceController(params: WorkspaceControllerParams): WorkspaceController {
  // TODO(T-034): tailor + copyText. TODO(T-036): stage.
  const db = useSQLiteContext();
  const { show } = useSnackbar();
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState);
  const [aiMissing, setAiMissing] = useState(true);
  const [logging, setLogging] = useState(false);
  const [recommendedResume, setRecommendedResume] = useState<Resume | null>(null);
  const webViewRef = useRef<WebViewHandle | null>(null);
  const stateRef = useRef(state);
  const providerRef = useRef<AiProvider | null>(null);
  const boardRef = useRef(params.activeBoard);
  const abortRef = useRef<AbortController | null>(null);
  const scrapeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fillTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenContext = useRef(params.contextKey);

  useEffect(() => {
    stateRef.current = state;
    boardRef.current = params.activeBoard;
  }, [params.activeBoard, state]);

  const stopInFlight = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (scrapeTimer.current !== null) {
      clearTimeout(scrapeTimer.current);
      scrapeTimer.current = null;
    }
    if (fillTimer.current !== null) {
      clearTimeout(fillTimer.current);
      fillTimer.current = null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void loadAiConfig().then(async (config) => {
        const key = await getApiKey();
        if (cancelled) return;
        const provider = config === null ? null : createProvider(config, key);
        providerRef.current = provider;
        setAiMissing(provider === null);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    if (seenContext.current === params.contextKey) return;
    seenContext.current = params.contextKey;
    stopInFlight();
    setRecommendedResume(null);
    dispatch({ type: 'CONTEXT_CHANGED' });
  }, [params.contextKey, stopInFlight]);

  useEffect(() => stopInFlight, [stopInFlight]);

  const runAnalyze = useCallback(
    async (message: PageScrapedMessage, controller: AbortController) => {
      const profile = await getProfile(db);
      if (controller.signal.aborted || stateRef.current.phase !== 'analyzing') return;
      if (profile === null) {
        dispatch({ type: 'PROFILE_MISSING' });
        return;
      }
      const preferences = await getPreferences(db);
      const resumes = await listResumes(db);
      const answers = await listAnswers(db);
      if (controller.signal.aborted || stateRef.current.phase !== 'analyzing') return;
      const result = await analyzeJob(
        providerRef.current,
        { profile, preferences, resumes, answers, scraped: message, today: new Date() },
        controller.signal,
      );
      if (controller.signal.aborted || stateRef.current.phase !== 'analyzing') return;
      if (!result.ok) {
        dispatch({ type: 'ANALYSIS_FAILED', code: result.error.code });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      setRecommendedResume(resumes.find((resume) => resume.id === result.value.recommendedResumeId) ?? null);
      dispatch({
        type: 'ANALYSIS_SUCCEEDED',
        session: {
          analysis: result.value,
          sourceUrl: message.url,
          boardName: boardRef.current?.name ?? 'Shared link',
          scrapedInputCount: message.inputs.length,
          pageText: message.pageText,
        },
      });
    },
    [db],
  );

  const reanalyze = useCallback(() => {
    stopInFlight();
    setRecommendedResume(null);
    dispatch({ type: 'ANALYZE_REQUESTED' });
    stateRef.current = workspaceReducer(stateRef.current, { type: 'ANALYZE_REQUESTED' });
    webViewRef.current?.injectJavaScript(SCRAPE_PAGE_JS);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrapeTimer.current = setTimeout(() => {
      scrapeTimer.current = null;
      if (stateRef.current.phase === 'scraping') dispatch({ type: 'SCRAPE_FAILED', code: 'TIMEOUT' });
    }, BRIDGE_TIMEOUT_MS);
  }, [stopInFlight]);

  const onBridgeMessage = useCallback(
    (raw: string) => {
      const parsed = parseBridgeMessage(raw);
      if (!parsed.ok) return;
      const message = parsed.value;

      if (message.type === 'AUTOFILL_COMPLETE' || message.type === 'AUTOFILL_ERROR') {
        if (stateRef.current.phase !== 'filling') return;
        if (fillTimer.current !== null) {
          clearTimeout(fillTimer.current);
          fillTimer.current = null;
        }
        if (message.type === 'AUTOFILL_ERROR') {
          dispatch({ type: 'FILL_FAILED' });
          show('Auto-fill failed on this page');
          return;
        }
        const total = stateRef.current.session?.analysis.fieldMappings.length ?? message.filledCount + message.missingClawIds.length;
        dispatch({
          type: 'FILL_COMPLETED',
          filledCount: message.filledCount,
          missingCount: message.missingClawIds.length,
        });
        show(`Filled ${message.filledCount} of ${total} fields`);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const currentMappings = stateRef.current.session?.analysis.fieldMappings ?? [];
        const filledAnswerBank = currentMappings.filter(
          (m) =>
            m.source === 'ANSWER_BANK' &&
            !message.missingClawIds.includes(m.clawId) &&
            typeof m.value === 'string' &&
            m.value.trim() !== '',
        );
        if (filledAnswerBank.length > 0) {
          void listAnswers(db).then(async (answers) => {
            const idsToIncrement: number[] = [];
            for (const mapping of filledAnswerBank) {
              const key = mapping.fieldLabel.trim().replace(/\s+/g, ' ').toLowerCase();
              const match = answers.find(
                (a) => a.question.trim().replace(/\s+/g, ' ').toLowerCase() === key,
              );
              if (match) {
                idsToIncrement.push(match.id);
              }
            }
            if (idsToIncrement.length > 0) {
              await incrementAnswerUse(db, Array.from(new Set(idsToIncrement)));
            }
          });
        }
        return;
      }

      if (message.type !== 'PAGE_SCRAPED' && message.type !== 'SCRAPE_ERROR') return;
      if (stateRef.current.phase !== 'scraping') return;
      if (scrapeTimer.current !== null) {
        clearTimeout(scrapeTimer.current);
        scrapeTimer.current = null;
      }
      if (message.type === 'SCRAPE_ERROR') {
        dispatch({ type: 'SCRAPE_FAILED', code: 'SCRIPT_ERROR' });
        return;
      }
      dispatch({ type: 'SCRAPE_SUCCEEDED', message });
      if (message.pageText.length < SCRAPE_LIMITS.minPageTextChars) return;
      stateRef.current = { ...stateRef.current, phase: 'analyzing' };
      const controller = new AbortController();
      abortRef.current = controller;
      void runAnalyze(message, controller);
    },
    [db, runAnalyze, show],
  );

  const onAnalyzePress = useCallback(() => {
    if (aiMissing) {
      router.push('/settings/ai');
      return;
    }
    const current = stateRef.current;
    if (current.phase === 'ready' && !current.sheetOpen && params.currentUrl === current.session?.sourceUrl) {
      dispatch({ type: 'SHEET_OPENED' });
      return;
    }
    reanalyze();
  }, [aiMissing, params.currentUrl, reanalyze]);

  const autoFill = useCallback(() => {
    const current = stateRef.current;
    const mappings = current.session?.analysis.fieldMappings ?? [];
    const isOnSourcePage = params.currentUrl === current.session?.sourceUrl;
    if (current.phase !== 'ready' || !isOnSourcePage || mappings.length === 0) return;
    if (fillTimer.current !== null) {
      clearTimeout(fillTimer.current);
      fillTimer.current = null;
    }
    dispatch({ type: 'FILL_REQUESTED' });
    stateRef.current = workspaceReducer(stateRef.current, { type: 'FILL_REQUESTED' });
    webViewRef.current?.injectJavaScript(buildAutoFillScript(mappings));
    fillTimer.current = setTimeout(() => {
      fillTimer.current = null;
      if (stateRef.current.phase === 'filling') {
        dispatch({ type: 'FILL_FAILED' });
        show('Auto-fill failed on this page');
      }
    }, BRIDGE_TIMEOUT_MS);
  }, [params.currentUrl, show]);

  const saveAnswer = useCallback(
    async (mapping: FieldMapping) => {
      const result = await upsertAnswer(db, {
        question: mapping.fieldLabel,
        answer: mapping.value,
      });
      if (result.ok) {
        dispatch({ type: 'ANSWER_SAVED', clawId: mapping.clawId });
        show('Saved to answer bank');
      } else {
        show('Could not save answer');
      }
    },
    [db, show],
  );

  const logApplication = useCallback(async () => {
    const current = stateRef.current;
    if (logging || current.loggedApplicationId !== null) return;
    if ((current.phase !== 'ready' && current.phase !== 'filling') || current.session === null) return;
    const session = current.session;
    const tailored = current.tailor.status === 'ready' ? current.tailor.result : null;
    setLogging(true);
    const saved = await insertApplication(db, {
      companyName: session.analysis.companyName,
      roleTitle: session.analysis.roleTitle,
      boardName: session.boardName,
      jobUrl: session.sourceUrl,
      resumeId: recommendedResume?.id ?? null,
      resumeLabel: recommendedResume?.label ?? '',
      matchScore: session.analysis.matchScore,
      eligibility: session.analysis.eligibility,
      redFlags: session.analysis.redFlags,
      coverNote: tailored?.coverNote ?? null,
      coldDm: tailored?.coldDm ?? null,
      status: 'APPLIED',
    });
    setLogging(false);
    if (!saved.ok) {
      show(saved.error === 'DUPLICATE' ? 'Already in Tracker' : 'Could not save. Try again.');
      return;
    }
    dispatch({ type: 'APPLICATION_LOGGED', applicationId: saved.value.id });
    show('Logged to Tracker');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [db, logging, recommendedResume, show]);

  const closeSheet = useCallback(() => {
    stopInFlight();
    dispatch({ type: 'SHEET_CLOSED' });
  }, [stopInFlight]);

  const noop = () => {};
  const asyncNoop = async () => {};
  return {
    state,
    webViewRef,
    isOnSourcePage: params.currentUrl === state.session?.sourceUrl,
    recommendedResume,
    aiMissing,
    staging: false,
    logging,
    stagingExplainerVisible: false,
    onStagingExplainerContinue: noop,
    onStagingExplainerCancel: noop,
    onBridgeMessage,
    onAnalyzePress,
    reanalyze,
    autoFill,
    tailor: noop,
    saveAnswer,
    logApplication,
    stageRecommendedResume: asyncNoop,
    copyText: asyncNoop,
    closeSheet,
  };
}
