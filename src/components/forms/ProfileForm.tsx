import { X } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { isHttpUrl } from '../../lib/url';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, spacing, typography } from '../../theme/tokens';
import type { CandidateProfile, ProfileLink } from '../../types/domain';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { TagInput } from '../ui/TagInput';
import { TextField } from '../ui/TextField';

export interface ProfileFormProps {
  value: CandidateProfile;
  onChange: (value: CandidateProfile) => void;
  /** Field-level errors keyed by field name, e.g. { email: 'Enter a valid email' }. */
  errors: Partial<Record<keyof CandidateProfile, string>>;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

/** Validation used by onboarding and Settings before saving. Returns {} when valid. */
export function validateProfile(value: CandidateProfile): Partial<Record<keyof CandidateProfile, string>> {
  const errors: Partial<Record<keyof CandidateProfile, string>> = {};
  if (value.fullName.trim() === '') errors.fullName = 'Enter your name';
  if (!EMAIL_PATTERN.test(value.email.trim())) errors.email = 'Enter a valid email';
  const country = value.countryCode.trim();
  if (country !== '' && !/^[A-Za-z]{2}$/.test(country)) {
    errors.countryCode = 'Use a 2-letter country code, e.g. BD';
  }
  return errors;
}

function resumeCount(value: CandidateProfile): string | null {
  if (value.experience.length === 0 && value.education.length === 0) return null;
  const roles = value.experience.length === 1 ? '1 role' : `${value.experience.length} roles`;
  const degrees = value.education.length === 1 ? '1 degree' : `${value.education.length} degrees`;
  return `${roles}, ${degrees} from your resume`;
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
  const { colors } = useTheme();
  const counts = resumeCount(props.value);

  function patch(partial: Partial<CandidateProfile>) {
    props.onChange({ ...props.value, ...partial });
  }

  function updateLink(index: number, partial: Partial<ProfileLink>) {
    const links = props.value.links.map((link, i) => (i === index ? { ...link, ...partial } : link));
    patch({ links });
  }

  return (
    <View style={styles.form}>
      <TextField
        label="Full name"
        value={props.value.fullName}
        onChangeText={(fullName) => patch({ fullName })}
        testID={TestIds.profileForm.fullName}
        autoComplete="name"
        error={props.errors.fullName}
      />
      <TextField
        label="Email"
        value={props.value.email}
        onChangeText={(email) => patch({ email })}
        testID={TestIds.profileForm.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={props.errors.email}
      />
      <TextField
        label="Phone"
        value={props.value.phone}
        onChangeText={(phone) => patch({ phone })}
        testID={TestIds.profileForm.phone}
        keyboardType="phone-pad"
        autoComplete="tel"
      />
      <TextField
        label="Location"
        value={props.value.location}
        onChangeText={(location) => patch({ location })}
        testID={TestIds.profileForm.location}
        placeholder="City, Country"
      />
      <TextField
        label="Country code"
        value={props.value.countryCode}
        onChangeText={(countryCode) => patch({ countryCode: countryCode.toUpperCase() })}
        testID={TestIds.profileForm.country}
        autoCapitalize="none"
        maxLength={2}
        error={props.errors.countryCode}
      />
      <TextField
        label="Time zone"
        value={props.value.timeZone}
        onChangeText={(timeZone) => patch({ timeZone })}
        testID={TestIds.profileForm.timeZone}
        autoCapitalize="none"
      />
      <TextField
        label="Headline"
        value={props.value.headline}
        onChangeText={(headline) => patch({ headline })}
        testID={TestIds.profileForm.headline}
      />
      <TextField
        label="Summary"
        value={props.value.summary}
        onChangeText={(summary) => patch({ summary })}
        testID={TestIds.profileForm.summary}
        multiline
        numberOfLines={4}
      />
      <TagInput
        label="Skills"
        values={props.value.skills}
        onChange={(skills) => patch({ skills })}
        testID={TestIds.profileForm.skills}
        max={50}
      />
      <View testID={TestIds.profileForm.links} style={styles.links}>
        <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.label, { color: colors.textPrimary }]}>
          Links
        </Text>
        {props.value.links.map((link, index) => {
          const urlError = link.url.trim() !== '' && !isHttpUrl(link.url.trim()) ? 'Enter a full http(s) address' : undefined;
          return (
            <View key={`link-${index}`} style={styles.linkRow}>
              <TextField
                label="Label"
                value={link.label}
                onChangeText={(label) => updateLink(index, { label })}
                testID={`${TestIds.profileForm.links}-label-${index}`}
              />
              <TextField
                label="URL"
                value={link.url}
                onChangeText={(url) => updateLink(index, { url })}
                testID={`${TestIds.profileForm.links}-url-${index}`}
                keyboardType="url"
                autoCapitalize="none"
                autoComplete="url"
                error={urlError}
              />
              <IconButton
                icon={X}
                accessibilityLabel={`Remove ${link.label || 'link'}`}
                onPress={() => patch({ links: props.value.links.filter((_, i) => i !== index) })}
              />
            </View>
          );
        })}
        <Button
          label="Add link"
          variant="secondary"
          accessibilityLabel="Add link"
          onPress={() => {
            if (props.value.links.length >= 10) return;
            patch({ links: [...props.value.links, { label: '', url: '' }] });
          }}
        />
      </View>
      <TagInput
        label="Extra facts"
        values={props.value.extraFacts}
        onChange={(extraFacts) => patch({ extraFacts })}
        testID={TestIds.profileForm.extraFacts}
        max={20}
        helper="Facts auto-fill may use, e.g. Notice period: 2 weeks"
      />
      {counts ? (
        <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.counts, { color: colors.textSecondary }]}>
          {counts}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  links: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
  },
  linkRow: {
    gap: spacing.xs,
  },
  counts: {
    ...typography.body,
  },
});
