import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { SCRAPE_PAGE_JS } from '../../../bridge/scrapePageScript';
import type { WebViewHandle } from '../../../components/workspace/PortalWebView';
import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { analyzeJob, createProvider } from '../../../services/ai/aiClient';
import { clearAiConfig, saveAiConfig } from '../../../services/ai/config';
import { setApiKey } from '../../../services/secrets';
import type { JobAnalysis, JobBoard } from '../../../types/domain';
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

jest.mock('../../../services/ai/aiClient', () => ({
  createProvider: jest.fn(),
  analyzeJob: jest.fn(),
}));

const createProviderMock = createProvider as jest.Mock;
const analyzeJobMock = analyzeJob as jest.Mock;

const board: JobBoard = {
  id: 1,
  name: 'LinkedIn',
  url: 'https://www.linkedin.com',
  lastVisitedUrl: null,
  sortOrder: 0,
};

const analysis: JobAnalysis = {
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
});
