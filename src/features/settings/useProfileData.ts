import type { CandidateProfile, JobPreferences } from '../../types/domain';

export interface ProfileDataState {
  status: 'loading' | 'ready' | 'error';
  /** Saved profile or EMPTY_PROFILE with timeZone/countryCode prefilled from the device
   *  (expo-localization getCalendars()[0].timeZone, getLocales()[0].regionCode). */
  profile: CandidateProfile;
  preferences: JobPreferences;
  saveProfile: (profile: CandidateProfile) => Promise<boolean>;
  savePreferences: (preferences: JobPreferences) => Promise<boolean>;
}

/** Shared by onboarding steps 3–4 and Settings → Profile / Preferences. CONTRACT: ARCHITECTURE.md §7.5. */
export function useProfileData(): ProfileDataState {
  // TODO(T-019): load + saveProfile. TODO(T-020): savePreferences.
  return {
    status: 'loading',
    profile: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      countryCode: '',
      timeZone: '',
      headline: '',
      summary: '',
      links: [],
      skills: [],
      experience: [],
      education: [],
      extraFacts: [],
    },
    preferences: {
      targetRoles: [],
      workModes: ['REMOTE'],
      workAuthorizedCountries: [],
      openToSponsorship: false,
      minTimeZoneOverlapHours: 2,
      minSalary: null,
      salaryCurrency: 'USD',
      blockedCompanies: [],
    },
    saveProfile: async () => false,
    savePreferences: async () => false,
  };
}
