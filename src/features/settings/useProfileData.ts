import { getCalendars, getLocales } from 'expo-localization';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

import {
  getPreferences,
  getProfile,
  savePreferences as persistPreferences,
  saveProfile as persistProfile,
} from '../../db/repositories/profileRepo';
import { DEFAULT_PREFERENCES, EMPTY_PROFILE, type CandidateProfile, type JobPreferences } from '../../types/domain';

export interface ProfileDataState {
  status: 'loading' | 'ready' | 'error';
  /** Saved profile or EMPTY_PROFILE with timeZone/countryCode prefilled from the device
   *  (expo-localization getCalendars()[0].timeZone, getLocales()[0].regionCode). */
  profile: CandidateProfile;
  preferences: JobPreferences;
  saveProfile: (profile: CandidateProfile) => Promise<boolean>;
  savePreferences: (preferences: JobPreferences) => Promise<boolean>;
}

function blankProfile(patch: Partial<CandidateProfile> = {}): CandidateProfile {
  return {
    ...EMPTY_PROFILE,
    links: [],
    skills: [],
    experience: [],
    education: [],
    extraFacts: [],
    ...patch,
  };
}

/** Device time zone and country, used when no profile has been saved yet. */
export function deviceProfileDefaults(): CandidateProfile {
  const zone = getCalendars()[0]?.timeZone;
  const region = getLocales()[0]?.regionCode;
  const timeZone = typeof zone === 'string' ? zone : '';
  const countryCode = typeof region === 'string' && /^[A-Za-z]{2}$/.test(region) ? region.toUpperCase() : '';
  return blankProfile({ timeZone, countryCode });
}

/** Shared by onboarding steps 3–4 and Settings → Profile / Preferences. CONTRACT: ARCHITECTURE.md §7.5. */
export function useProfileData(): ProfileDataState {
  const db = useSQLiteContext();
  const [status, setStatus] = useState<ProfileDataState['status']>('loading');
  const [profile, setProfile] = useState<CandidateProfile>(() => deviceProfileDefaults());
  const [preferences, setPreferences] = useState<JobPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const saved = await getProfile(db);
        const savedPreferences = await getPreferences(db);
        if (cancelled) return;
        setProfile(saved ?? deviceProfileDefaults());
        setPreferences(savedPreferences);
        setStatus('ready');
      } catch {
        if (cancelled) return;
        setProfile(deviceProfileDefaults());
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  const saveProfile = useCallback(
    async (next: CandidateProfile) => {
      try {
        await persistProfile(db, next);
        setProfile(next);
        return true;
      } catch {
        return false;
      }
    },
    [db],
  );

  const savePreferences = useCallback(
    async (next: JobPreferences) => {
      try {
        await persistPreferences(db, next);
        setPreferences(next);
        return true;
      } catch {
        return false;
      }
    },
    [db],
  );

  return { status, profile, preferences, saveProfile, savePreferences };
}
