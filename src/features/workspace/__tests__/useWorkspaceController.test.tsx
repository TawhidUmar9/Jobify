import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { SCRAPE_PAGE_JS } from '../../../bridge/scrapePageScript';
import type { WebViewHandle } from '../../../components/workspace/PortalWebView';
import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { incrementAnswerUse, listAnswers, upsertAnswer } from '../../../db/repositories/answersRepo';
import * as Clipboard from 'expo-clipboard';
import { attachTailorText, insertApplication } from '../../../db/repositories/applicationsRepo';
import { Platform } from 'react-native';
import { analyzeJob, createProvider, tailorApplication } from '../../../services/ai/aiClient';
import { stageResume } from '../../../services/resumeStaging';
import { KV_KEYS, kvGet, kvRemove } from '../../../services/kvStore';
import { clearAiConfig, saveAiConfig } from '../../../services/ai/config';
import { setApiKey } from '../../../services/secrets';
import type { JobAnalysis, JobBoard, TailorResult } from '../../../types/domain';
import { useWorkspaceController } from '../useWorkspaceController';
import { BRIDGE_TIMEOUT_MS } from '../workspaceReducer';

const mockDb = createFakeDb();
const mockPush = jest.fn();
let refocus: (() => void) | null = null;

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb.db,
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    router: { push: (...args: unknown[]) => mockPush(...args) },
    useFocusEffect: (effect: () => void | (() => void)) => {
      refocus = effect;
      React.useEffect(() => effect(), [effect]);
    },
  };
});

const mockShow = jest.fn();

jest.mock('../../../components/ui/Snackbar', () => ({
  useSnackbar: () => ({ show: (...args: unknown[]) => mockShow(...args) }),
}));

jest.mock('../../../db/repositories/applicationsRepo', () => ({
  insertApplication: jest.fn(),
  attachTailorText: jest.fn(),
}));

jest.mock('../../../db/repositories/answersRepo', () => ({
  listAnswers: jest.fn().mockResolvedValue([]),
  upsertAnswer: jest.fn().mockResolvedValue({ ok: true, value: { id: 1 } }),
  incrementAnswerUse: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../services/resumeStaging', () => ({
  stageResume: jest.fn(),
}));

jest.mock('../../../services/ai/aiClient', () => ({
  createProvider: jest.fn(),
  analyzeJob: jest.fn(),
  tailorApplication: jest.fn(),
}));

const createProviderMock = createProvider as jest.Mock;
const analyzeJobMock = analyzeJob as jest.Mock;
const insertApplicationMock = insertApplication as jest.Mock;
const attachTailorTextMock = attachTailorText as jest.Mock;
const tailorApplicationMock = tailorApplication as jest.Mock;
const listAnswersMock = listAnswers as jest.Mock;
const upsertAnswerMock = upsertAnswer as jest.Mock;
const incrementAnswerUseMock = incrementAnswerUse as jest.Mock;

const board: JobBoard = {
  id: 1,
  name: 'LinkedIn',
  url: 'https://www.linkedin.com',
  lastVisitedUrl: null,
  sortOrder: 0,
};

const analysis: JobAnalysis = {
  isJobPosting: true,
  companyName: 'Acme Cloud',
  roleTitle: 'Backend engineer',
  eligibility: 'ELIGIBLE',
  eligibilityReason: 'Matches the posting.',
  redFlags: [],
  matchScore: 70,
  recommendedResumeId: null,
  resumeReason: 'None saved',
  matchedSkills: [],
  missingSkills: [],
  fieldMappings: [],
};

const analysisWithMappings: JobAnalysis = {
  ...analysis,
  fieldMappings: [
    { clawId: 'f0', fieldLabel: 'Full name', value: 'Alex Rahman', source: 'PROFILE' },
    { clawId: 'f1', fieldLabel: 'Notice period', value: '1 month', source: 'ANSWER_BANK' },
    { clawId: 'f2', fieldLabel: 'Why Acme?', value: 'Love it', source: 'GENERATED' },
  ],
};

function pageMessage(length: number): string {
  return JSON.stringify({
    type: 'PAGE_SCRAPED',
    url: 'https://example.com/job',
    title: 'Job',
    pageText: 'a'.repeat(length),
    inputs: [],
  });
}

function handle(): WebViewHandle {
  return {
    injectJavaScript: jest.fn(),
    goBack: jest.fn(),
    goForward: jest.fn(),
    reload: jest.fn(),
    stopLoading: jest.fn(),
  };
}

describe('useWorkspaceController', () => {
  beforeEach(async () => {
    jest.useRealTimers();
    mockDb.calls.length = 0;
    mockPush.mockClear();
    createProviderMock.mockReset();
    analyzeJobMock.mockReset();
    insertApplicationMock.mockReset();
    tailorApplicationMock.mockReset();
    listAnswersMock.mockReset().mockResolvedValue([]);
    upsertAnswerMock.mockReset().mockResolvedValue({ ok: true, value: { id: 1 } });
    incrementAnswerUseMock.mockReset().mockResolvedValue(undefined);
    mockShow.mockClear();
    await clearAiConfig();
  });

  async function mount(contextKey = 0) {
    const view = await renderHook(
      (props: { contextKey: number }) =>
        useWorkspaceController({
          activeBoard: board,
          currentUrl: 'https://example.com/job',
          contextKey: props.contextKey,
        }),
      { initialProps: { contextKey } },
    );
    await waitFor(() => expect(createProviderMock.mock.calls.length + (view.result.current.aiMissing ? 0 : 1)).toBeGreaterThanOrEqual(0));
    return view;
  }

  it('loads AI config on mount and again on focus', async () => {
    const first = await mount();
    await waitFor(() => expect(first.result.current.aiMissing).toBe(true));
    await saveAiConfig({ provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' });
    await setApiKey('test-key');
    createProviderMock.mockReturnValue({ kind: 'gemini' });
    await act(async () => {
      refocus?.();
    });
    await waitFor(() => expect(first.result.current.aiMissing).toBe(false));
    expect(createProviderMock).toHaveBeenCalled();
  });

  it('opens AI settings when no provider is configured', async () => {
    const { result } = await mount();
    await waitFor(() => expect(result.current.aiMissing).toBe(true));
    const web = handle();
    result.current.webViewRef.current = web;
    await act(async () => {
      result.current.onAnalyzePress();
    });
    expect(mockPush).toHaveBeenCalledWith('/settings/ai');
    expect(web.injectJavaScript).not.toHaveBeenCalled();
  });

  it('injects the scraper and times out after 5 seconds', async () => {
    jest.useFakeTimers();
    await saveAiConfig({ provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' });
    await setApiKey('test-key');
    createProviderMock.mockReturnValue({ kind: 'gemini' });
    const { result } = await renderHook(() =>
      useWorkspaceController({ activeBoard: board, currentUrl: 'https://example.com/job', contextKey: 0 }),
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const web = handle();
    result.current.webViewRef.current = web;
    await act(async () => {
      result.current.onAnalyzePress();
    });
    expect(web.injectJavaScript).toHaveBeenCalledWith(SCRAPE_PAGE_JS);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(result.current.state.phase).toBe('scraping');
    await act(async () => {
      jest.advanceTimersByTime(BRIDGE_TIMEOUT_MS - 1);
    });
    expect(result.current.state.phase).toBe('scraping');
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.state.error).toEqual({ kind: 'SCRAPE', code: 'TIMEOUT' });
  });

  it('ignores bridge messages that the phase is not waiting for', async () => {
    await saveAiConfig({ provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' });
    await setApiKey('test-key');
    createProviderMock.mockReturnValue({ kind: 'gemini' });
    const { result } = await mount();
    await waitFor(() => expect(result.current.aiMissing).toBe(false));
    await act(async () => {
      result.current.onBridgeMessage(pageMessage(200));
      result.current.onBridgeMessage(JSON.stringify({ type: 'AUTOFILL_COMPLETE', filledCount: 1, missingClawIds: [] }));
    });
    expect(result.current.state.phase).toBe('idle');
    expect(analyzeJobMock).not.toHaveBeenCalled();
  });

  it('reports NO_PROFILE when nothing is saved', async () => {
    await saveAiConfig({ provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' });
    await setApiKey('test-key');
    createProviderMock.mockReturnValue({ kind: 'gemini' });
    const { result } = await mount();
    await waitFor(() => expect(result.current.aiMissing).toBe(false));
    result.current.webViewRef.current = handle();
    await act(async () => {
      result.current.onAnalyzePress();
      result.current.onBridgeMessage(pageMessage(200));
    });
    await waitFor(() => expect(result.current.state.error).toEqual({ kind: 'NO_PROFILE' }));
    expect(analyzeJobMock).not.toHaveBeenCalled();
  });

  it('reaches ready with the board name and page text', async () => {
    await saveAiConfig({ provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' });
    await setApiKey('test-key');
    createProviderMock.mockReturnValue({ kind: 'gemini' });
    analyzeJobMock.mockResolvedValue({ ok: true, value: analysis });
    mockDb.queue('getFirstAsync', { data_json: JSON.stringify({ fullName: 'Alex Rahman' }) });
    const { result } = await mount();
    await waitFor(() => expect(result.current.aiMissing).toBe(false));
    result.current.webViewRef.current = handle();
    const text = 'a'.repeat(200);
    await act(async () => {
      result.current.onAnalyzePress();
      result.current.onBridgeMessage(pageMessage(200));
    });
    await waitFor(() => expect(result.current.state.phase).toBe('ready'));
    expect(result.current.state.session?.boardName).toBe('LinkedIn');
    expect(result.current.state.session?.pageText).toBe(text);
    expect(result.current.isOnSourcePage).toBe(true);
  });

  it('aborts an in-flight analysis when the sheet closes or the context changes', async () => {
    await saveAiConfig({ provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' });
    await setApiKey('test-key');
    createProviderMock.mockReturnValue({ kind: 'gemini' });
    const captured: { signal: AbortSignal | null } = { signal: null };
    analyzeJobMock.mockImplementation((_provider: unknown, _args: unknown, signal: AbortSignal) => {
      captured.signal = signal;
      return new Promise(() => {});
    });
    mockDb.queue('getFirstAsync', { data_json: JSON.stringify({ fullName: 'Alex Rahman' }) });
    const view = await mount();
    await waitFor(() => expect(view.result.current.aiMissing).toBe(false));
    view.result.current.webViewRef.current = handle();
    await act(async () => {
      view.result.current.onAnalyzePress();
      view.result.current.onBridgeMessage(pageMessage(200));
    });
    await waitFor(() => expect(analyzeJobMock).toHaveBeenCalled());
    await act(async () => {
      view.result.current.closeSheet();
    });
    expect(view.result.current.state.phase).toBe('idle');
    expect(captured.signal?.aborted).toBe(true);

    analyzeJobMock.mockResolvedValue({ ok: true, value: analysis });
    mockDb.queue('getFirstAsync', { data_json: JSON.stringify({ fullName: 'Alex Rahman' }) });
    await act(async () => {
      view.result.current.onAnalyzePress();
      view.result.current.onBridgeMessage(pageMessage(200));
    });
    await waitFor(() => expect(view.result.current.state.phase).toBe('ready'));
    await act(async () => {
      view.rerender({ contextKey: 1 });
    });
    await waitFor(() => expect(view.result.current.state.phase).toBe('idle'));
    expect(view.result.current.state.session).toBeNull();
  });

  it('logs the application and reports duplicate or database errors', async () => {
    await saveAiConfig({ provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' });
    await setApiKey('test-key');
    createProviderMock.mockReturnValue({ kind: 'gemini' });
    analyzeJobMock.mockResolvedValue({ ok: true, value: analysis });
    mockDb.queue('getFirstAsync', { data_json: JSON.stringify({ fullName: 'Alex Rahman' }) });
    const { result } = await mount();
    await waitFor(() => expect(result.current.aiMissing).toBe(false));
    result.current.webViewRef.current = handle();
    await act(async () => {
      result.current.onAnalyzePress();
      result.current.onBridgeMessage(pageMessage(200));
    });
    await waitFor(() => expect(result.current.state.phase).toBe('ready'));

    insertApplicationMock.mockResolvedValue({ ok: false, error: 'DUPLICATE' });
    await act(async () => {
      await result.current.logApplication();
    });
    expect(mockShow).toHaveBeenCalledWith('Already in Tracker');
    expect(result.current.state.loggedApplicationId).toBeNull();

    mockShow.mockClear();
    insertApplicationMock.mockResolvedValue({ ok: false, error: 'DB_ERROR' });
    await act(async () => {
      await result.current.logApplication();
    });
    expect(mockShow).toHaveBeenCalledWith('Could not save. Try again.');

    mockShow.mockClear();
    insertApplicationMock.mockResolvedValue({ ok: true, value: { id: 4 } });
    await act(async () => {
      await result.current.logApplication();
    });
    expect(insertApplicationMock).toHaveBeenLastCalledWith(
      mockDb.db,
      expect.objectContaining({
        companyName: 'Acme Cloud',
        roleTitle: 'Backend engineer',
        boardName: 'LinkedIn',
        jobUrl: 'https://example.com/job',
        resumeId: null,
        resumeLabel: '',
        status: 'APPLIED',
      }),
    );
    expect(mockShow).toHaveBeenCalledWith('Logged to Tracker');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    expect(result.current.state.loggedApplicationId).toBe(4);

    insertApplicationMock.mockClear();
    await act(async () => {
      await result.current.logApplication();
    });
    expect(insertApplicationMock).not.toHaveBeenCalled();
  });

  it('runs autoFill, handles complete, error, timeout, and increments answer use count', async () => {
    jest.useFakeTimers();
    await saveAiConfig({ provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' });
    await setApiKey('test-key');
    createProviderMock.mockReturnValue({ kind: 'gemini' });
    analyzeJobMock.mockResolvedValue({ ok: true, value: analysisWithMappings });
    listAnswersMock.mockResolvedValue([
      { id: 10, question: 'Notice period', answer: '1 month', useCount: 0, updatedAt: '' },
    ]);
    mockDb.queue('getFirstAsync', { data_json: JSON.stringify({ fullName: 'Alex Rahman' }) });

    const { result } = await renderHook(() =>
      useWorkspaceController({ activeBoard: board, currentUrl: 'https://example.com/job', contextKey: 0 }),
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const web = handle();
    result.current.webViewRef.current = web;

    await act(async () => {
      result.current.onAnalyzePress();
      result.current.onBridgeMessage(pageMessage(200));
    });
    expect(result.current.state.phase).toBe('ready');

    // 1. autoFill triggers script injection and transitions to 'filling'
    await act(async () => {
      result.current.autoFill();
    });
    expect(result.current.state.phase).toBe('filling');
    expect(web.injectJavaScript).toHaveBeenCalled();

    // 2. AUTOFILL_COMPLETE transitions to ready, shows snackbar, increments answer use
    await act(async () => {
      result.current.onBridgeMessage(
        JSON.stringify({ type: 'AUTOFILL_COMPLETE', filledCount: 2, missingClawIds: ['f0'] }),
      );
    });
    expect(result.current.state.phase).toBe('ready');
    expect(result.current.state.lastFill).toEqual({ filledCount: 2, missingCount: 1 });
    expect(mockShow).toHaveBeenCalledWith('Filled 2 of 3 fields');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(incrementAnswerUseMock).toHaveBeenCalledWith(mockDb.db, [10]);

    // 3. AUTOFILL_ERROR handling
    await act(async () => {
      result.current.autoFill();
    });
    expect(result.current.state.phase).toBe('filling');
    await act(async () => {
      result.current.onBridgeMessage(JSON.stringify({ type: 'AUTOFILL_ERROR', error: 'Page error' }));
    });
    expect(result.current.state.phase).toBe('ready');
    expect(mockShow).toHaveBeenCalledWith('Auto-fill failed on this page');

    // 4. Timeout handling
    await act(async () => {
      result.current.autoFill();
    });
    expect(result.current.state.phase).toBe('filling');
    await act(async () => {
      jest.advanceTimersByTime(BRIDGE_TIMEOUT_MS);
    });
    expect(result.current.state.phase).toBe('ready');
    expect(mockShow).toHaveBeenCalledWith('Auto-fill failed on this page');
  });

  it('saves an answer and updates savedAnswerClawIds', async () => {
    await saveAiConfig({ provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' });
    await setApiKey('test-key');
    createProviderMock.mockReturnValue({ kind: 'gemini' });
    analyzeJobMock.mockResolvedValue({ ok: true, value: analysisWithMappings });
    mockDb.queue('getFirstAsync', { data_json: JSON.stringify({ fullName: 'Alex Rahman' }) });

    const { result } = await mount();
    result.current.webViewRef.current = handle();
    await act(async () => {
      result.current.onAnalyzePress();
      result.current.onBridgeMessage(pageMessage(200));
    });
    await waitFor(() => expect(result.current.state.phase).toBe('ready'));

    upsertAnswerMock.mockResolvedValueOnce({ ok: true, value: { id: 1 } });
    await act(async () => {
      await result.current.saveAnswer(analysisWithMappings.fieldMappings[2]!);
    });
    expect(upsertAnswerMock).toHaveBeenCalledWith(mockDb.db, {
      question: 'Why Acme?',
      answer: 'Love it',
    });
    expect(result.current.state.savedAnswerClawIds).toEqual(['f2']);
    expect(mockShow).toHaveBeenCalledWith('Saved to answer bank');

    upsertAnswerMock.mockResolvedValueOnce({ ok: false, error: 'DB_ERROR' });
    await act(async () => {
      await result.current.saveAnswer(analysisWithMappings.fieldMappings[0]!);
    });
    expect(mockShow).toHaveBeenCalledWith('Could not save answer');
  });
  it('tailors application, stores text when already logged, and handles errors', async () => {
    await saveAiConfig({ provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' });
    await setApiKey('test-key');
    createProviderMock.mockReturnValue({ kind: 'gemini' });
    analyzeJobMock.mockResolvedValue({ ok: true, value: analysisWithMappings });
    mockDb.queue('getFirstAsync', { data_json: JSON.stringify({ fullName: 'Alex Rahman' }) });

    const sampleTailor: TailorResult = {
      emphasize: ['Docker experience'],
      bulletRewrites: [{ original: 'Built APIs', suggested: 'Built Node APIs', reason: 'Match' }],
      coverNote: 'My cover note',
      coldDm: 'My cold dm',
    };

    const { result } = await mount();
    result.current.webViewRef.current = handle();
    await act(async () => {
      result.current.onAnalyzePress();
      result.current.onBridgeMessage(pageMessage(200));
    });
    await waitFor(() => expect(result.current.state.phase).toBe('ready'));

    // First log the application
    insertApplicationMock.mockResolvedValue({ ok: true, value: { id: 7 } });
    await act(async () => {
      await result.current.logApplication();
    });
    expect(result.current.state.loggedApplicationId).toBe(7);

    // Now tailor
    tailorApplicationMock.mockResolvedValueOnce({ ok: true, value: sampleTailor });
    mockDb.queue('getFirstAsync', { data_json: JSON.stringify({ fullName: 'Alex Rahman' }) });
    await act(async () => {
      result.current.tailor();
    });
    await waitFor(() => expect(result.current.state.tailor.status).toBe('ready'));
    expect(attachTailorTextMock).toHaveBeenCalledWith(mockDb.db, 'https://example.com/job', {
      coverNote: 'My cover note',
      coldDm: 'My cold dm',
    });

    // Error test
    tailorApplicationMock.mockResolvedValueOnce({ ok: false, error: { code: 'RATE_LIMITED' } });
    mockDb.queue('getFirstAsync', { data_json: JSON.stringify({ fullName: 'Alex Rahman' }) });
    await act(async () => {
      result.current.tailor();
    });
    await waitFor(() => expect(result.current.state.tailor).toEqual({ status: 'error', code: 'RATE_LIMITED' }));
  });

  it('aborts tailor and resets to idle when sheet is closed during loading', async () => {
    await saveAiConfig({ provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' });
    await setApiKey('test-key');
    createProviderMock.mockReturnValue({ kind: 'gemini' });
    analyzeJobMock.mockResolvedValue({ ok: true, value: analysisWithMappings });
    mockDb.queue('getFirstAsync', { data_json: JSON.stringify({ fullName: 'Alex Rahman' }) });

    const captured: { signal: AbortSignal | null } = { signal: null };
    tailorApplicationMock.mockImplementation((_p: unknown, _a: unknown, signal: AbortSignal) => {
      captured.signal = signal;
      return new Promise(() => {});
    });

    const { result } = await mount();
    result.current.webViewRef.current = handle();
    await act(async () => {
      result.current.onAnalyzePress();
      result.current.onBridgeMessage(pageMessage(200));
    });
    await waitFor(() => expect(result.current.state.phase).toBe('ready'));

    mockDb.queue('getFirstAsync', { data_json: JSON.stringify({ fullName: 'Alex Rahman' }) });
    await act(async () => {
      result.current.tailor();
    });
    expect(result.current.state.tailor.status).toBe('loading');

    await act(async () => {
      result.current.closeSheet();
    });
    expect(result.current.state.tailor.status).toBe('idle');
    expect(captured.signal?.aborted).toBe(true);
  });

  it('copies text to clipboard and shows snackbar', async () => {
    const { result } = await mount();
    await act(async () => {
      await result.current.copyText('Hello world');
    });
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('Hello world');
    expect(mockShow).toHaveBeenCalledWith('Copied');
  });

  it("shows snackbar when stageRecommendedResume is called without resume", async () => {
    const { result } = await mount();
    await act(async () => {
      await result.current.stageRecommendedResume();
    });
    expect(mockShow).toHaveBeenCalledWith("Add a resume in Settings first");
  });

  it("handles staging flow on Android: explainer on first use, cancel stores nothing, continue stages", async () => {
    Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
    await kvRemove(KV_KEYS.stagingExplainerSeen);

    await saveAiConfig({ provider: "gemini", model: "gemini-3.8-flash", baseUrl: "https://generativelanguage.googleapis.com" });
    await setApiKey("test-key");
    createProviderMock.mockReturnValue({ kind: "gemini" });
    analyzeJobMock.mockResolvedValue({ ok: true, value: { ...analysisWithMappings, recommendedResumeId: 1 } });

    const rawResumeRow = {
      id: 1,
      label: "Backend",
      file_name: "alex.pdf",
      file_uri: "file://alex.pdf",
      content_json: JSON.stringify({ summary: "", skills: [], highlights: [] }),
      created_at: "2026-10-12",
    };
    const mockResume = {
      id: 1,
      label: "Backend",
      fileName: "alex.pdf",
      fileUri: "file://alex.pdf",
      content: { summary: "", skills: [], highlights: [] },
      createdAt: "2026-10-12",
    };
    mockDb.queue("getFirstAsync", { data_json: JSON.stringify({ fullName: "Alex Rahman" }) });
    mockDb.queue("getAllAsync", [rawResumeRow]);

    const { result } = await mount();
    result.current.webViewRef.current = handle();
    await act(async () => {
      result.current.onAnalyzePress();
      result.current.onBridgeMessage(pageMessage(200));
    });
    await waitFor(() => expect(result.current.state.phase).toBe("ready"));
    await waitFor(() => expect(result.current.recommendedResume).toEqual(mockResume));

    // First tap -> shows explainer
    await act(async () => {
      await result.current.stageRecommendedResume();
    });
    await waitFor(() => expect(result.current.stagingExplainerVisible).toBe(true));
    expect(await kvGet(KV_KEYS.stagingExplainerSeen)).toBeNull();

    // Cancel -> hides explainer, does not set kv
    await act(async () => {
      result.current.onStagingExplainerCancel();
    });
    await waitFor(() => expect(result.current.stagingExplainerVisible).toBe(false));
    expect(await kvGet(KV_KEYS.stagingExplainerSeen)).toBeNull();

    // Re-tap and continue
    (stageResume as jest.Mock).mockResolvedValueOnce({
      ok: true,
      value: { platform: "android", destinationUri: "content://jobify/alex.pdf", clipboardCopied: true },
    });

    await act(async () => {
      await result.current.stageRecommendedResume();
    });
    await waitFor(() => expect(result.current.stagingExplainerVisible).toBe(true));

    await act(async () => {
      await result.current.onStagingExplainerContinue();
    });
    await waitFor(() => expect(result.current.stagingExplainerVisible).toBe(false));
    expect(await kvGet(KV_KEYS.stagingExplainerSeen)).toBe("true");
    expect(stageResume).toHaveBeenCalledWith(mockResume, "");
    expect(mockShow).toHaveBeenCalledWith("Resume saved to your Jobify folder. Cover note copied.");
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);

    // Subsequent tap -> no explainer shown
    (stageResume as jest.Mock).mockResolvedValueOnce({
      ok: true,
      value: { platform: "android", destinationUri: "content://jobify/alex.pdf", clipboardCopied: false },
    });
    await act(async () => {
      await result.current.stageRecommendedResume();
    });
    expect(result.current.stagingExplainerVisible).toBe(false);
    expect(mockShow).toHaveBeenCalledWith("Resume saved to your Jobify folder.");
  });

  it("handles staging errors and maps them to snackbars", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });

    await saveAiConfig({ provider: "gemini", model: "gemini-3.8-flash", baseUrl: "https://generativelanguage.googleapis.com" });
    await setApiKey("test-key");
    createProviderMock.mockReturnValue({ kind: "gemini" });
    analyzeJobMock.mockResolvedValue({ ok: true, value: { ...analysisWithMappings, recommendedResumeId: 1 } });

    const rawResumeRow = {
      id: 1,
      label: "Backend",
      file_name: "alex.pdf",
      file_uri: "file://alex.pdf",
      content_json: JSON.stringify({ summary: "", skills: [], highlights: [] }),
      created_at: "2026-10-12",
    };
    const mockResume = {
      id: 1,
      label: "Backend",
      fileName: "alex.pdf",
      fileUri: "file://alex.pdf",
      content: { summary: "", skills: [], highlights: [] },
      createdAt: "2026-10-12",
    };
    mockDb.queue("getFirstAsync", { data_json: JSON.stringify({ fullName: "Alex Rahman" }) });
    mockDb.queue("getAllAsync", [rawResumeRow]);

    const { result } = await mount();
    result.current.webViewRef.current = handle();
    await act(async () => {
      result.current.onAnalyzePress();
      result.current.onBridgeMessage(pageMessage(200));
    });
    await waitFor(() => expect(result.current.recommendedResume).toEqual(mockResume));

    const errors = [
      ["NO_FILE", "This resume has no PDF. Add one in Settings → Resumes."],
      ["PERMISSION_DENIED", "Folder access was not granted. Tap Stage CV to try again."],
      ["FILE_MISSING", "The resume file is missing. Re-import it in Settings → Resumes."],
      ["WRITE_FAILED", "Could not save the resume. Try again."],
      ["SHARE_UNAVAILABLE", "Sharing is not available on this device."],
    ];

    for (const [code, expectedMsg] of errors) {
      (stageResume as jest.Mock).mockResolvedValueOnce({
        ok: false,
        error: { code, clipboardCopied: false },
      });
      await act(async () => {
        await result.current.stageRecommendedResume();
      });
      expect(mockShow).toHaveBeenCalledWith(expectedMsg);
    }
  });

  it('guards autoFill, tailor, logApplication, and stageRecommendedResume when isJobPosting is false (D-008)', async () => {
    await saveAiConfig({ provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' });
    await setApiKey('test-key');
    createProviderMock.mockReturnValue({ kind: 'gemini' });
    analyzeJobMock.mockResolvedValue({
      ok: true,
      value: { ...analysisWithMappings, isJobPosting: false, recommendedResumeId: 1 },
    });
    mockDb.queue('getFirstAsync', { data_json: JSON.stringify({ fullName: 'Alex Rahman' }) });

    const { result } = await mount();
    const webView = handle();
    result.current.webViewRef.current = webView;
    await act(async () => {
      result.current.onAnalyzePress();
      result.current.onBridgeMessage(pageMessage(200));
    });
    await waitFor(() => expect(result.current.state.phase).toBe('ready'));
    (webView.injectJavaScript as jest.Mock).mockClear();

    // autoFill should do nothing
    await act(async () => {
      result.current.autoFill();
    });
    expect(result.current.state.phase).toBe('ready');
    expect(webView.injectJavaScript).not.toHaveBeenCalled();

    tailorApplicationMock.mockClear();
    // tailor should do nothing
    await act(async () => {
      await result.current.tailor();
    });
    expect(result.current.state.tailor.status).toBe('idle');
    expect(tailorApplicationMock).not.toHaveBeenCalled();

    // logApplication should do nothing
    insertApplicationMock.mockClear();
    await act(async () => {
      await result.current.logApplication();
    });
    expect(insertApplicationMock).not.toHaveBeenCalled();

    // stageRecommendedResume should do nothing
    (stageResume as jest.Mock).mockClear();
    await act(async () => {
      await result.current.stageRecommendedResume();
    });
    expect(stageResume).not.toHaveBeenCalled();
    expect(result.current.stagingExplainerVisible).toBe(false);
  });
});
