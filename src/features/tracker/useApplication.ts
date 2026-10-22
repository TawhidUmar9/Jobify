import type { Application, ApplicationPatch } from '../../types/domain';

export interface ApplicationState {
  status: 'loading' | 'ready' | 'not_found' | 'error';
  application: Application | null;
  /** patchApplication → update local state. Resolves false on failure. */
  update: (patch: ApplicationPatch) => Promise<boolean>;
  /** deleteApplication → resolves true, caller navigates back. */
  remove: () => Promise<boolean>;
}

/**
 * One application for the detail screen. CONTRACT: ARCHITECTURE.md §7.4.
 * - id from the route param; non-integer or <= 0 → 'not_found' without a DB call.
 * - getApplication null → 'not_found'; throws → 'error'.
 */
export function useApplication(idParam: string | undefined): ApplicationState {
  // TODO(T-037): implement per the rules above.
  void idParam;
  return { status: 'loading', application: null, update: async () => false, remove: async () => false };
}
