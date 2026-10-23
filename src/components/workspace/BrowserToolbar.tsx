import { useState } from 'react';
import { BookmarkCheck, BookmarkPlus, ChevronLeft, ChevronRight, RotateCw, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { displayHost, normalizeAddressInput } from '../../lib/url';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, radii, spacing, typography } from '../../theme/tokens';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';

export interface BrowserToolbarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  /** 0..1; bar hidden when not loading. */
  progress: number;
  loading: boolean;
  /** Current page URL; shown as displayHost(url). */
  url: string;
  saved: boolean;
  canSave: boolean;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onSave: () => void;
  /** Called with a normalized http(s) URL typed into the address bar. */
  onOpenAddress: (url: string) => void;
}

/**
 * Row under the board bar, height 48. UI_DIRECTIVES.md §4.1 "Browser toolbar", DECISIONS.md D-009.
 * [Back ChevronLeft toolbarBack "Back"] [Forward ChevronRight toolbarForward "Forward"]
 * [host button (toolbarAddress, flex 1, caption textSecondary, ellipsize middle,
 *  label "Address: <host>. Double tap to type a link")]
 * [Save for later BookmarkPlus/BookmarkCheck TestIds.toolbar.save ("Save job for later" / "Saved in Tracker")]
 * [Reload RotateCw toolbarReload "Reload page"].
 * Tapping the host replaces the row with an address bar: TextField-like input (TestIds.workspace.addressInput,
 * keyboardType url, autoFocus, prefilled with the full URL, selectTextOnFocus) + "Go" (addressGo) + Cancel X.
 * Submit: normalizeAddressInput(text) → onOpenAddress(url) and close; null → inline error "Enter a web address".
 * 2px progress bar on the bottom edge (TestIds.workspace.progressBar), colors.progress.
 */
export function BrowserToolbar(props: BrowserToolbarProps) {
  const { colors } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const host = displayHost(props.url);

  function handleStartEditing() {
    setAddressInput(props.url);
    setError(null);
    setIsEditing(true);
  }

  function handleCancelEditing() {
    setIsEditing(false);
    setError(null);
  }

  function handleSubmit() {
    const normalized = normalizeAddressInput(addressInput);
    if (normalized) {
      setError(null);
      setIsEditing(false);
      props.onOpenAddress(normalized);
    } else {
      setError('Enter a web address');
    }
  }

  const progressPercent = Math.min(100, Math.max(0, props.progress * 100));

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {isEditing ? (
        <View style={styles.editWrap}>
          <View style={styles.editRow}>
            <TextInput
              testID={TestIds.workspace.addressInput}
              accessibilityLabel="Web address"
              value={addressInput}
              onChangeText={(text) => {
                setAddressInput(text);
                if (error) setError(null);
              }}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
              keyboardType="url"
              autoFocus
              selectTextOnFocus
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceMuted,
                  color: colors.textPrimary,
                  borderColor: error ? colors.dangerIcon : colors.borderStrong,
                },
              ]}
            />
            <Button
              label="Go"
              testID={TestIds.workspace.addressGo}
              accessibilityLabel="Go"
              onPress={handleSubmit}
            />
            <IconButton
              icon={X}
              accessibilityLabel="Cancel"
              onPress={handleCancelEditing}
            />
          </View>
          {error ? (
            <Text
              maxFontSizeMultiplier={fontScaleCaps.default}
              style={[styles.errorText, { color: colors.dangerText }]}
            >
              {error}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.viewRow}>
          <IconButton
            icon={ChevronLeft}
            testID={TestIds.workspace.toolbarBack}
            accessibilityLabel="Back"
            disabled={!props.canGoBack}
            onPress={props.onBack}
          />
          <IconButton
            icon={ChevronRight}
            testID={TestIds.workspace.toolbarForward}
            accessibilityLabel="Forward"
            disabled={!props.canGoForward}
            onPress={props.onForward}
          />
          <Pressable
            testID={TestIds.workspace.addressButton}
            accessibilityRole="button"
            accessibilityLabel={`Address: ${host}. Double tap to type a link`}
            onPress={handleStartEditing}
            style={[styles.addressButton, { backgroundColor: colors.surfaceMuted }]}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="middle"
              maxFontSizeMultiplier={fontScaleCaps.default}
              style={[styles.addressText, { color: colors.textSecondary }]}
            >
              {host}
            </Text>
          </Pressable>
          <IconButton
            icon={props.saved ? BookmarkCheck : BookmarkPlus}
            testID={TestIds.toolbar.save}
            accessibilityLabel={props.saved ? 'Saved in Tracker' : 'Save job for later'}
            disabled={!props.canSave}
            onPress={props.onSave}
          />
          <IconButton
            icon={RotateCw}
            testID={TestIds.workspace.toolbarReload}
            accessibilityLabel="Reload page"
            onPress={props.onReload}
          />
        </View>
      )}

      {props.loading ? (
        <View
          testID={TestIds.workspace.progressBar}
          style={[
            styles.progressBar,
            {
              backgroundColor: colors.progress,
              width: `${progressPercent}%`,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    position: 'relative',
  },
  viewRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxs,
  },
  editWrap: {
    paddingHorizontal: spacing.xxs,
    paddingVertical: spacing.xxs,
    gap: spacing.xxs,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    height: 38,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    ...typography.body,
  },
  addressButton: {
    flex: 1,
    height: 36,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.xxs,
  },
  addressText: {
    ...typography.caption,
  },
  errorText: {
    ...typography.caption,
    paddingHorizontal: spacing.xs,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
  },
});
