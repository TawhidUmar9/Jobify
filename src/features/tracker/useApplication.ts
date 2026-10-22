import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';

import {
  deleteApplication,
  getApplication,
  patchApplication,
} from '../../db/repositories/applicationsRepo';
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
  const db = useSQLiteContext();
  const requestRef = useRef(0);

  const numId =
    idParam !== undefined && /^-?\d+$/.test(idParam.trim())
      ? Number(idParam.trim())
      : null;
  const isValidId = numId !== null && Number.isInteger(numId) && numId > 0;

  const [status, setStatus] = useState<ApplicationState['status']>(
    isValidId ? 'loading' : 'not_found',
  );
  const [application, setApplication] = useState<Application | null>(null);

  const load = useCallback(async () => {
    if (!isValidId || numId === null) {
      setStatus('not_found');
      setApplication(null);
      return;
    }
    const request = ++requestRef.current;
    try {
      const app = await getApplication(db, numId);
      if (request !== requestRef.current) return;
      if (!app) {
        setStatus('not_found');
        setApplication(null);
      } else {
        setApplication(app);
        setStatus('ready');
      }
    } catch {
      if (request !== requestRef.current) return;
      setStatus('error');
    }
  }, [db, isValidId, numId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const update = useCallback(
    async (patch: ApplicationPatch): Promise<boolean> => {
      if (!isValidId || numId === null) return false;
      try {
        const updated = await patchApplication(db, numId, patch);
        if (updated) {
          setApplication(updated);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [db, isValidId, numId],
  );

  const remove = useCallback(async (): Promise<boolean> => {
    if (!isValidId || numId === null) return false;
    try {
      await deleteApplication(db, numId);
      return true;
    } catch {
      return false;
    }
  }, [db, isValidId, numId]);

  return { status, application, update, remove };
}
