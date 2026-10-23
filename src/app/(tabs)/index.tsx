import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CopilotSheet } from '../../components/copilot/CopilotSheet';
import { StagingExplainer } from '../../components/copilot/StagingExplainer';
import { useSnackbar } from '../../components/ui/Snackbar';
import { StateView } from '../../components/ui/StateView';
import { AnalyzeFab } from '../../components/workspace/AnalyzeFab';
import { BoardBar } from '../../components/workspace/BoardBar';
import { BrowserToolbar } from '../../components/workspace/BrowserToolbar';
import { PortalWebView, type WebNavState } from '../../components/workspace/PortalWebView';
import { TestIds } from '../../constants/testIds';
import { findApplicationByUrl, insertApplication } from '../../db/repositories/applicationsRepo';
import { useBoards } from '../../features/workspace/useBoards';
import { useWorkspaceController } from '../../features/workspace/useWorkspaceController';
import { displayHost, isHttpUrl } from '../../lib/url';
import { useTheme } from '../../theme/ThemeProvider';

/** Route params for "/". CONTRACT: ARCHITECTURE.md §8. */
export type WorkspaceParams = {
  /** Absolute http(s) URL to open (deep link jobify:///?url=<encoded>, share intent, "Open job post"). */
  url?: string;
};

const EMPTY_NAV: WebNavState = { url: '', title: '', loading: true, canGoBack: false, canGoForward: false };

/**
 * Workspace. UI_DIRECTIVES.md §4.1, DECISIONS.md D-009. Layout inside SafeAreaView edges=['top']: BoardBar, BrowserToolbar,
 * PortalWebView (flex 1); overlays AnalyzeFab (hidden while the sheet is open), CopilotSheet, StagingExplainer.
 * - boards.status loading → StateView "Loading job boards…"; error → StateView error + Retry (boards.reload).
 * - No boards and no targetUrl → StateView empty (TestIds.workspace.emptyBoards) "No job boards" /
 *   "Add one in Settings → Job boards, or tap the address bar to open a link." + button to /settings/boards.
 * - `url` param (T-025): http(s) → boards.openUrl(url) once, then router.setParams({ url: undefined }).
 * - Android back (T-044): sheet open → closeSheet; canGoBack → goBack; else default.
 * - onNavStateChange → setNav and, when !loading, boards.recordVisit(url) (T-045).
 * - FAB disabled when nav.loading or phase in scraping|analyzing|filling (never when aiMissing).
 * - Save for later (D-009, T-046d): toolbar-save icon button (BookmarkPlus/BookmarkCheck).
 *   canSave = isHttpUrl(nav.url) && !nav.loading. saved = findApplicationByUrl(nav.url) exists.
 *   onSave = if exists -> snackbar "Already in Tracker"; else insertApplication(status: SAVED) -> snackbar "Saved to Tracker", light haptics.
 */
export default function WorkspaceScreen() {
  const params = useLocalSearchParams<WorkspaceParams>();
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const { show } = useSnackbar();
  const boards = useBoards();
  const requestedUrl = typeof params.url === 'string' ? params.url : undefined;
  const { openUrl, recordVisit } = boards;
  useEffect(() => {
    if (!isHttpUrl(requestedUrl)) return;
    openUrl(requestedUrl);
    router.setParams({ url: undefined });
  }, [openUrl, requestedUrl]);
  const [nav, setNav] = useState<WebNavState>(EMPTY_NAV);
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState(false);

  const controller = useWorkspaceController({
    activeBoard: boards.activeBoard,
    currentUrl: nav.url,
    contextKey: boards.contextKey,
  });
  const { state } = controller;
  const busy = state.phase === 'scraping' || state.phase === 'analyzing' || state.phase === 'filling';

  const checkSaved = useCallback(
    async (url: string) => {
      if (!isHttpUrl(url)) {
        setSaved(false);
        return;
      }
      try {
        const app = await findApplicationByUrl(db, url);
        setSaved(app !== null);
      } catch {
        setSaved(false);
      }
    },
    [db],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isHttpUrl(nav.url)) {
        await Promise.resolve();
        if (!cancelled) setSaved(false);
        return;
      }
      try {
        const app = await findApplicationByUrl(db, nav.url);
        if (!cancelled) setSaved(app !== null);
      } catch {
        if (!cancelled) setSaved(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, nav.url]);

  useFocusEffect(
    useCallback(() => {
      void checkSaved(nav.url);
    }, [checkSaved, nav.url]),
  );

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (state.sheetOpen) {
          controller.closeSheet();
          return true;
        }
        if (nav.canGoBack) {
          controller.webViewRef.current?.goBack();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [state.sheetOpen, controller, nav.canGoBack]),
  );

  const handleNavStateChange = useCallback(
    (nextNav: WebNavState) => {
      setNav(nextNav);
      if (!nextNav.loading && nextNav.url) {
        recordVisit(nextNav.url);
      }
    },
    [recordVisit],
  );

  const canSave = isHttpUrl(nav.url) && !nav.loading;

  const handleSave = useCallback(async () => {
    if (!isHttpUrl(nav.url)) return;
    const existing = await findApplicationByUrl(db, nav.url);
    if (existing) {
      setSaved(true);
      show('Already in Tracker');
      return;
    }
    const analysis = state.session?.sourceUrl === nav.url ? state.session.analysis : null;
    const companyName = analysis?.companyName || displayHost(nav.url);
    const navTitle = nav.title?.trim();
    const roleTitle = analysis?.roleTitle || (navTitle ? navTitle.slice(0, 120) : 'Saved job');
    const boardName = boards.activeBoard?.name ?? 'Shared link';

    const result = await insertApplication(db, {
      companyName,
      roleTitle,
      boardName,
      jobUrl: nav.url,
      resumeId: null,
      resumeLabel: '',
      matchScore: null,
      eligibility: null,
      redFlags: [],
      coverNote: null,
      coldDm: null,
      status: 'SAVED',
    });

    if (!result.ok) {
      if (result.error === 'DUPLICATE') {
        setSaved(true);
        show('Already in Tracker');
      } else {
        show('Could not save. Try again.');
      }
      return;
    }

    setSaved(true);
    show('Saved to Tracker');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [db, nav.url, nav.title, state.session, boards.activeBoard, show]);

  const showEmpty = boards.boards.length === 0 && boards.targetUrl === '';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }} testID={TestIds.workspace.screen}>
      {boards.status === 'loading' ? (
        <StateView kind="loading" message="Loading job boards…" />
      ) : boards.status === 'error' ? (
        <StateView
          kind="error"
          title="Could not load job boards"
          message="The local database did not open. Try again."
          actionLabel="Try again"
          onAction={boards.reload}
        />
      ) : showEmpty ? (
        <StateView
          kind="empty"
          testID={TestIds.workspace.emptyBoards}
          title="No job boards"
          message="Add one in Settings → Job boards, or tap the address bar to open a link."
          actionLabel="Manage job boards"
          onAction={() => router.push('/settings/boards')}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <BoardBar boards={boards.boards} activeBoardId={boards.activeBoard?.id ?? null} onSelect={boards.selectBoard} />
          <BrowserToolbar
            canGoBack={nav.canGoBack}
            canGoForward={nav.canGoForward}
            progress={progress}
            loading={nav.loading}
            url={nav.url}
            saved={saved}
            canSave={canSave}
            onBack={() => controller.webViewRef.current?.goBack()}
            onForward={() => controller.webViewRef.current?.goForward()}
            onReload={() => controller.webViewRef.current?.reload()}
            onSave={handleSave}
            onOpenAddress={boards.openUrl}
          />
          {boards.targetUrl ? (
            <PortalWebView
              webViewRef={controller.webViewRef}
              url={boards.targetUrl}
              onNavStateChange={handleNavStateChange}
              onLoadProgress={setProgress}
              onMessage={controller.onBridgeMessage}
            />
          ) : null}
          {!state.sheetOpen ? (
            <AnalyzeFab
              onPress={controller.onAnalyzePress}
              disabled={!controller.aiMissing && (nav.loading || busy)}
              busy={busy}
              aiMissing={controller.aiMissing}
            />
          ) : null}
          <CopilotSheet
            state={state}
            recommendedResume={controller.recommendedResume}
            isOnSourcePage={controller.isOnSourcePage}
            staging={controller.staging}
            logging={controller.logging}
            onClose={controller.closeSheet}
            onReanalyze={controller.reanalyze}
            onAutoFill={controller.autoFill}
            onTailor={controller.tailor}
            onSaveAnswer={controller.saveAnswer}
            onStageResume={controller.stageRecommendedResume}
            onLogApplication={controller.logApplication}
            onCopy={controller.copyText}
            onOpenSettings={(path) => router.push(path)}
          />
          <StagingExplainer
            visible={controller.stagingExplainerVisible}
            onContinue={controller.onStagingExplainerContinue}
            onCancel={controller.onStagingExplainerCancel}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
