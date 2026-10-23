import { useContext, useEffect, useState } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { TestIds } from '../../constants/testIds';
import { normalizeAddressInput } from '../../lib/url';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, radii, spacing, typography } from '../../theme/tokens';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';

export interface BoardFormProps {
  visible: boolean;
  /** null = add; otherwise edit with initial values. */
  initial: { name: string; url: string } | null;
  /** Error from boardsRepo: shown under the matching field. */
  error: 'INVALID_NAME' | 'INVALID_URL' | null;
  onSave: (input: { name: string; url: string }) => void;
  onCancel: () => void;
}

function BoardFormContent(props: BoardFormProps) {
  const { colors } = useTheme();
  const insets = useContext(SafeAreaInsetsContext);
  const bottom = (insets?.bottom ?? 0) + spacing.md;
  const [name, setName] = useState(props.initial?.name ?? '');
  const [url, setUrl] = useState(props.initial?.url ?? '');
  const [clientError, setClientError] = useState<'INVALID_NAME' | 'INVALID_URL' | null>(null);

  const nameError =
    props.error === 'INVALID_NAME' || clientError === 'INVALID_NAME'
      ? 'Use 1–16 characters'
      : undefined;

  const urlError =
    props.error === 'INVALID_URL' || clientError === 'INVALID_URL'
      ? 'Enter a full https:// address'
      : undefined;

  function handleSave() {
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 16) {
      setClientError('INVALID_NAME');
      return;
    }
    const normalized = normalizeAddressInput(url);
    if (!normalized) {
      setClientError('INVALID_URL');
      return;
    }
    props.onSave({ name: trimmedName, url: normalized });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}
    >
      <View accessibilityViewIsModal aria-modal={true} style={[styles.panel, { backgroundColor: colors.surface, paddingBottom: Math.max(spacing.xl, bottom) }]}>
        <Text
          style={[styles.panelTitle, { color: colors.textPrimary }]}
          maxFontSizeMultiplier={fontScaleCaps.default}
        >
          {props.initial ? 'Edit job board' : 'Add job board'}
        </Text>

        <ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
          <TextField
            label="Board name"
            value={name}
            onChangeText={(val) => {
              setName(val);
              setClientError(null);
            }}
            maxLength={16}
            error={nameError}
            testID={TestIds.boards.formName}
            autoCapitalize="words"
          />

          <TextField
            label="Web address"
            value={url}
            onChangeText={(val) => {
              setUrl(val);
              setClientError(null);
            }}
            keyboardType="url"
            autoCapitalize="none"
            error={urlError}
            testID={TestIds.boards.formUrl}
          />

          <View style={styles.actions}>
            <Button
              label="Save"
              testID={TestIds.boards.formSave}
              onPress={handleSave}
            />
            <Button
              label="Cancel"
              variant="ghost"
              testID={TestIds.boards.formCancel}
              onPress={props.onCancel}
            />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * Bottom panel modal: Name (TextField max 16, TestIds.boards.formName), URL (keyboard url,
 * TestIds.boards.formUrl; input normalized with normalizeAddressInput on save), Cancel / Save.
 * Errors: INVALID_NAME "Use 1–16 characters"; INVALID_URL "Enter a full https:// address".
 */
export function BoardForm(props: BoardFormProps) {
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

  if (!props.visible) return null;
  const initialKey = props.initial ? `${props.initial.name}-${props.initial.url}` : 'add';

  return (
    <Modal visible={props.visible} transparent onRequestClose={props.onCancel} animationType={reduceMotion ? 'none' : 'slide'}>
      <BoardFormContent key={initialKey} {...props} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panel: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: '85%',
  },
  panelTitle: {
    ...typography.headline,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  panelContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
