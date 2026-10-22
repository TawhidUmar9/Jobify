import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
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
  const [nav, setNav] = useState<WebNavState>(EMPTY_NAV);
  const [progress, setProgress] = useState(0);
  const controller = useWorkspaceController({
    activeBoard: boards.activeBoard,
    currentUrl: nav.url,
    contextKey: boards.contextKey,
  });
  const { state } = controller;
  const busy = state.phase === 'scraping' || state.phase === 'analyzing' || state.phase === 'filling';

  // TODO(T-025): url param + empty state wiring. TODO(T-044): back handling. TODO(T-045): recordVisit.
  void params;

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
              onNavStateChange={setNav}
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
            onOpenSettings={() => {}}
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
