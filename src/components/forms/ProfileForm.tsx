import { Text, View } from 'react-native';

import type { CandidateProfile } from '../../types/domain';

export interface ProfileFormProps {
  value: CandidateProfile;
  onChange: (value: CandidateProfile) => void;
  /** Field-level errors keyed by field name, e.g. { email: 'Enter a valid email' }. */
  errors: Partial<Record<keyof CandidateProfile, string>>;
}

/** Validation used by onboarding and Settings before saving. Returns {} when valid. */
export function validateProfile(value: CandidateProfile): Partial<Record<keyof CandidateProfile, string>> {
  // TODO(T-019): fullName required ("Enter your name"); email required and /^\S+@\S+\.\S+$/
  // ("Enter a valid email"); countryCode '' or 2 letters ("Use a 2-letter country code, e.g. BD").
  void value;
  return {};
}

/**
 * Profile editor (TestIds.profileForm.*). Fields in order: Full name, Email (keyboard email),
 * Phone (tel), Location ("City, Country"), Country code (2 letters, auto upper-case),
 * Time zone (prefilled from the device; free text IANA name), Headline, Summary (multiline 4),
 * Skills (TagInput max 50), Links (rows of label + URL; add/remove; URL validated with isHttpUrl),
 * Extra facts (TagInput max 20, helper "Facts auto-fill may use, e.g. Notice period: 2 weeks").
 * Experience/education are kept from parsing but not editable in v1 (shown read-only as a count:
 * "3 roles, 1 degree from your resume").
 */
export function ProfileForm(props: ProfileFormProps) {
  // TODO(T-019): implement per the rules above.
  return (
    <View>
      <Text>{props.value.fullName}</Text>
    </View>
  );
}
