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
  // TODO(T-025): implement per the rules above.
}
