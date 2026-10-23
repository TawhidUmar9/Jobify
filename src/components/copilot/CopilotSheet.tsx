import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { RefreshCw, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import type { WorkspaceError, WorkspaceState } from '../../features/workspace/workspaceReducer';
import { AI_ERROR_MESSAGES } from '../../services/ai/types';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, radii, spacing, typography } from '../../theme/tokens';
import type { FieldMapping, Resume } from '../../types/domain';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { StateView } from '../ui/StateView';
import { CopilotActions } from './CopilotActions';
import { EligibilityBadge } from './EligibilityBadge';
import { FieldMappingList } from './FieldMappingList';
import { MatchCard } from './MatchCard';
import { NotJobPostCard } from './NotJobPostCard';
import { RedFlagList } from './RedFlagList';
import { SkillChips } from './SkillChips';
import { TailorCard } from './TailorCard';

export interface CopilotSheetProps {
  state: WorkspaceState;
  recommendedResume: Resume | null;
  isOnSourcePage: boolean;
  staging: boolean;
  logging: boolean;
  onClose: () => void;
  onReanalyze: () => void;
  onAutoFill: () => void;
  onTailor: () => void;
  onSaveAnswer: (mapping: FieldMapping) => void;
  onStageResume: () => void;
  onLogApplication: () => void;
  onCopy: (text: string) => void;
  /** Error-state secondary action, e.g. NO_PROFILE → open Settings → Profile; AI config errors → Settings → AI. */
  onOpenSettings: (path: '/settings/ai' | '/settings/profile') => void;
}

const AI_SETTINGS_CODES = new Set(['NOT_CONFIGURED', 'AUTH', 'MODEL_NOT_FOUND', 'BAD_REQUEST']);

function errorCopy(error: WorkspaceError): {
  title: string;
  message: string;
  action?: { label: string; path: '/settings/ai' | '/settings/profile' };
} {
  if (error.kind === 'NO_CONTENT') {
    return {
      title: 'Not enough text on this page',
      message: 'Open a job post or application form, then analyze again.',
    };
  }
  if (error.kind === 'NO_PROFILE') {
    return {
      title: 'Add your profile first',
      message: 'Jobify needs your profile to judge fit and fill forms.',
      action: { label: 'Open profile', path: '/settings/profile' },
    };
  }
  if (error.kind === 'SCRAPE') {
    return {
      title: "Couldn't read this page",
      message:
        error.code === 'TIMEOUT' ? 'The page did not respond in 5 seconds.' : 'This page blocked the reader.',
    };
  }
  return {
    title: 'Analysis failed',
    message: AI_ERROR_MESSAGES[error.code],
    action: AI_SETTINGS_CODES.has(error.code) ? { label: 'Open AI settings', path: '/settings/ai' } : undefined,
  };
}

/**
 * Gorhom BottomSheet with analysis results. UI_DIRECTIVES.md §4.4 "Copilot sheet".
 * - Controlled by state.sheetOpen via ref (snapToIndex(0) / close()); snapPoints ['50%', '92%'];
 *   enablePanDownToClose; onClose → props.onClose; BottomSheetBackdrop (pressBehavior close).
 * - Header (sticky): "Copilot" + IconButton RefreshCw (reanalyze, disabled while busy) + X (close).
 * - Body by phase:
 *   scraping → StateView loading "Reading the page…"; analyzing → "Asking the AI…" (TestIds.copilot.loading).
 *   error → StateView error (copilot-error) with copy from UI_DIRECTIVES §6 + "Try again" (copilot-retry);
 *     NO_PROFILE and AI codes NOT_CONFIGURED/AUTH/MODEL_NOT_FOUND/BAD_REQUEST also show a secondary
 *     button (copilot-error-action): "Open profile" / "Open AI settings".
 *   ready/filling → when analysis.isJobPosting is false (D-008), renders only NotJobPostCard (copilot-not-job)
 *     and disables footer actions; when true, renders EligibilityBadge, RedFlagList, MatchCard, SkillChips
 *     (matched, missing), TailorCard, FieldMappingList, stale notice when !isOnSourcePage; CopilotActions in footer.
 */
export function CopilotSheet(props: CopilotSheetProps) {
  const { colors } = useTheme();
  const sheetRef = useRef<ComponentRef<typeof BottomSheet> | null>(null);
  const snapPoints = useMemo(() => ['50%', '92%'], []);
  const busy = props.state.phase === 'scraping' || props.state.phase === 'analyzing' || props.state.phase === 'filling';
  const open = props.state.sheetOpen;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    const pending = AccessibilityInfo.isReduceMotionEnabled();
    if (typeof pending?.then === 'function') {
      pending
        .then((enabled) => {
          if (active) setReduceMotion(enabled);
        })
        .catch(() => {});
    }
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled: boolean) => {
      setReduceMotion(enabled);
    });
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  const snapOpen = useCallback(() => {
    const config = reduceMotion ? { duration: 0 } : undefined;
    if (open) sheetRef.current?.snapToIndex(0, config);
    else sheetRef.current?.close(config);
  }, [open, reduceMotion]);

  useEffect(() => {
    snapOpen();
  }, [snapOpen]);

  const footer = useCallback(
    (footerProps: BottomSheetFooterProps) => {
      if (props.state.phase !== 'ready' && props.state.phase !== 'filling') return null;
      const isJobPosting = props.state.session?.analysis.isJobPosting ?? true;
      const mappings = props.state.session?.analysis.fieldMappings.length ?? 0;
      return (
        <BottomSheetFooter {...footerProps}>
          <CopilotActions
            canAutoFill={isJobPosting && props.state.phase === 'ready' && props.isOnSourcePage && mappings > 0}
            filling={props.state.phase === 'filling'}
            staging={props.staging}
            logged={props.state.loggedApplicationId !== null}
            logging={props.logging}
            disabled={!isJobPosting}
            onAutoFill={props.onAutoFill}
            onStageResume={props.onStageResume}
            onLogApplication={props.onLogApplication}
          />
        </BottomSheetFooter>
      );
    },
    [props],
  );

  const backdrop = useCallback(
    (backdropProps: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...backdropProps} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={open ? 0 : -1}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      animateOnMount={!reduceMotion}
      animationConfigs={reduceMotion ? { duration: 0 } : undefined}
      accessibilityViewIsModal={open}
      aria-modal={open}
      onClose={props.onClose}
      backdropComponent={backdrop}
      onAnimate={(_from, toIndex) => {
        if (open && toIndex < 0) sheetRef.current?.snapToIndex(0);
      }}
      footerComponent={footer}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.borderStrong }}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]} maxFontSizeMultiplier={fontScaleCaps.default}>
          Copilot
        </Text>
        <IconButton
          icon={RefreshCw}
          accessibilityLabel="Re-analyze"
          testID={TestIds.copilot.reanalyze}
          disabled={busy}
          onPress={props.onReanalyze}
        />
        <IconButton icon={X} accessibilityLabel="Close" testID={TestIds.copilot.close} onPress={props.onClose} />
      </View>
      <BottomSheetScrollView testID={TestIds.copilot.sheet} contentContainerStyle={styles.body}>
        <SheetBody {...props} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function SheetBody(props: CopilotSheetProps) {
  const { colors } = useTheme();
  const { state } = props;
  if (state.phase === 'scraping' || state.phase === 'analyzing') {
    return (
      <StateView
        kind="loading"
        testID={TestIds.copilot.loading}
        message={state.phase === 'scraping' ? 'Reading the page…' : 'Asking the AI…'}
      />
    );
  }
  if (state.phase === 'error' && state.error) return <ErrorBody error={state.error} onReanalyze={props.onReanalyze} onOpenSettings={props.onOpenSettings} />;
  if ((state.phase === 'ready' || state.phase === 'filling') && state.session) {
    const { analysis } = state.session;
    if (analysis.isJobPosting === false) {
      return (
        <View style={styles.sections}>
          <NotJobPostCard />
        </View>
      );
    }
    return (
      <View style={styles.sections}>
        <EligibilityBadge eligibility={analysis.eligibility} reason={analysis.eligibilityReason} />
        <RedFlagList flags={analysis.redFlags} />
        <MatchCard score={analysis.matchScore} resume={props.recommendedResume} reason={analysis.resumeReason} />
        <SkillChips title="Matched skills" skills={analysis.matchedSkills} testID={TestIds.copilot.matchedSkills} />
        <SkillChips title="Missing skills" skills={analysis.missingSkills} testID={TestIds.copilot.missingSkills} />
        <TailorCard tailor={state.tailor} onTailor={props.onTailor} onCopy={props.onCopy} />
        <FieldMappingList
          mappings={analysis.fieldMappings}
          scrapedInputCount={state.session.scrapedInputCount}
          lastFill={state.lastFill}
          savedAnswerClawIds={state.savedAnswerClawIds}
          onSaveAnswer={props.onSaveAnswer}
        />
        {!props.isOnSourcePage ? (
          <View style={[styles.stale, { backgroundColor: colors.warningBg }]} testID={TestIds.copilot.staleNotice}>
            <Text style={{ color: colors.warningText, ...typography.body }} maxFontSizeMultiplier={fontScaleCaps.default}>
              You left the analyzed page. Auto-fill is off until you analyze again.
            </Text>
          </View>
        ) : null}
      </View>
    );
  }
  return null;
}

function ErrorBody({
  error,
  onReanalyze,
  onOpenSettings,
}: {
  error: WorkspaceError;
  onReanalyze: () => void;
  onOpenSettings: (path: '/settings/ai' | '/settings/profile') => void;
}) {
  const { colors } = useTheme();
  const copy = errorCopy(error);
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(copy.message);
  }, [copy.message]);
  return (
    <View testID={TestIds.copilot.error} style={styles.error}>
      <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>{copy.title}</Text>
      <Text testID={TestIds.copilot.errorMessage} style={[styles.errorMessage, { color: colors.textSecondary }]}>
        {copy.message}
      </Text>
      <Button label="Try again" testID={TestIds.copilot.retry} onPress={onReanalyze} />
      {copy.action ? (
        <Button
          label={copy.action.label}
          variant="secondary"
          testID={TestIds.copilot.errorAction}
          onPress={() => {
            if (copy.action) onOpenSettings(copy.action.path);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    ...typography.headline,
    flex: 1,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 96,
  },
  sections: {
    gap: spacing.lg,
  },
  stale: {
    borderRadius: radii.md,
    padding: spacing.md,
  },
  error: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  errorTitle: {
    ...typography.headline,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
  },
});
