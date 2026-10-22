import { useShareIntentContext } from 'expo-share-intent';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useSnackbar } from '../../components/ui/Snackbar';
import { isHttpUrl, extractFirstUrl } from '../../lib/url';
import { useOnboardingStatus } from '../onboarding/useOnboardingStatus';

/**
 * Android "Share to Jobify" (expo-share-intent, text/* only; iOS disabled in v1).
 * Mounted once in the root layout inside <ShareIntentProvider>. CONTRACT: ARCHITECTURE.md §8.
 *
 * Exact behaviour:
 * - When useShareIntentContext().hasShareIntent: url = shareIntent.webUrl ?? extractFirstUrl(shareIntent.text).
 *   - url null → snackbar "No link found in what you shared" and resetShareIntent().
 *   - onboarding not completed → ignore (resetShareIntent()); onboarding takes priority.
 *   - else router.navigate({ pathname: '/', params: { url } }) and resetShareIntent().
 */
export function useIncomingShare(): void {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const { completed } = useOnboardingStatus();
  const { show } = useSnackbar();
  const seen = useRef<string | null>(null);
  const signature = hasShareIntent
    ? `${shareIntent.webUrl ?? ''}|${shareIntent.text ?? ''}|${String(completed)}`
    : '';

  useEffect(() => {
    if (!hasShareIntent) {
      seen.current = null;
      return;
    }
    if (completed === null || seen.current === signature) return;
    seen.current = signature;
    if (!completed) {
      resetShareIntent();
      return;
    }
    const raw = shareIntent.webUrl ?? extractFirstUrl(shareIntent.text);
    const url = isHttpUrl(raw) ? raw : null;
    if (url === null) {
      show('No link found in what you shared');
      resetShareIntent();
      return;
    }
    router.navigate({ pathname: '/', params: { url } });
    resetShareIntent();
  }, [completed, hasShareIntent, resetShareIntent, shareIntent.text, shareIntent.webUrl, show, signature]);
}
