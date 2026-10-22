import { router } from 'expo-router';

import { StateView } from '../components/ui/StateView';

/** Unknown deep link. Complete, not a stub. */
export default function NotFoundScreen() {
  return (
    <StateView
      kind="empty"
      title="Page not found"
      message="This link does not match a screen in Jobify."
      actionLabel="Go to Workspace"
      onAction={() => router.replace('/')}
    />
  );
}
