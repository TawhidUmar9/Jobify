import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CopilotSheet } from '../../components/copilot/CopilotSheet';
import { StagingExplainer } from '../../components/copilot/StagingExplainer';
import { StateView } from '../../components/ui/StateView';
import { AnalyzeFab } from '../../components/workspace/AnalyzeFab';
import { BoardBar } from '../../components/workspace/BoardBar';
import { BrowserToolbar } from '../../components/workspace/BrowserToolbar';
import { PortalWebView, type WebNavState } from '../../components/workspace/PortalWebView';
import { TestIds } from '../../constants/testIds';
import { useBoards } from '../../features/workspace/useBoards';
import { useWorkspaceController } from '../../features/workspace/useWorkspaceController';
import { isHttpUrl } from '../../lib/url';
import { useTheme } from '../../theme/ThemeProvider';

/** Route params for "/". CONTRACT: ARCHITECTURE.md §8. */
export type WorkspaceParams = {
  /** Absolute http(s) URL to open (deep link jobify:///?url=<encoded>, share intent, "Open job post"). */
  url?: string;
};

const EMPTY_NAV: WebNavState = { url: '', title: '', loading: true, canGoBack: false, canGoForward: false };

/**
 * Workspace. UI_DIRECTIVES.md §4.1. Layout inside SafeAreaView edges=['top']: BoardBar, BrowserToolbar,
 * PortalWebView (flex 1); overlays AnalyzeFab (hidden while the sheet is open), CopilotSheet, StagingExplainer.
 * - boards.status loading → StateView "Loading job boards…"; error → StateView error + Retry (boards.reload).
 * - No boards and no targetUrl → StateView empty (TestIds.workspace.emptyBoards) "No job boards" /
 *   "Add one in Settings → Job boards, or tap the address bar to open a link." + button to /settings/boards.
 * - `url` param (T-025): http(s) → boards.openUrl(url) once, then router.setParams({ url: undefined }).
 * - Android back (T-044): sheet open → closeSheet; canGoBack → goBack; else default.
 * - onNavStateChange → setNav and, when !loading, boards.recordVisit(url) (T-045).
 * - FAB disabled when nav.loading or phase in scraping|analyzing|filling (never when aiMissing).
 */
export default function WorkspaceScreen() {
  const params = useLocalSearchParams<WorkspaceParams>();
  const { colors } = useTheme();
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
  const controller = useWorkspaceController({
    activeBoard: boards.activeBoard,
    currentUrl: nav.url,
    contextKey: boards.contextKey,
  });
  const { state } = controller;
  const busy = state.phase === 'scraping' || state.phase === 'analyzing' || state.phase === 'filling';

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
            onBack={() => controller.webViewRef.current?.goBack()}
            onForward={() => controller.webViewRef.current?.goForward()}
            onReload={() => controller.webViewRef.current?.reload()}
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
