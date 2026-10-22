import { StyleSheet, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { WORK_MODES, type JobPreferences, type WorkMode } from '../../types/domain';
import { spacing } from '../../theme/tokens';
import { SegmentedControl } from '../ui/SegmentedControl';
import { TagInput } from '../ui/TagInput';
import { TextField } from '../ui/TextField';
import { ToggleRow } from '../ui/ToggleRow';

export interface PreferencesFormProps {
  value: JobPreferences;
  onChange: (value: JobPreferences) => void;
}

const WORK_MODE_LABELS: Record<WorkMode, string> = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  ONSITE: 'On-site',
};

const OVERLAP_HOURS = [0, 2, 4, 6] as const;

function countryCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/**
 * Preferences editor (TestIds.preferencesForm.*), in order:
 * Target roles (TagInput max 10); Work mode (SegmentedControl multiple: Remote / Hybrid / On-site);
 * Countries I can work in without a visa (TagInput, normalize to 2-letter upper-case else reject,
 * helper "2-letter codes, e.g. BD, MY"); Open to visa sponsorship (ToggleRow);
 * Minimum time-zone overlap (SegmentedControl single: 0h / 2h / 4h / 6h);
 * Minimum yearly salary (numeric TextField, empty = no minimum) + Currency (3 letters);
 * Companies to avoid (TagInput max 50).
 */
export function PreferencesForm(props: PreferencesFormProps) {
  function patch(partial: Partial<JobPreferences>) {
    props.onChange({ ...props.value, ...partial });
  }

  const overlap = OVERLAP_HOURS.includes(props.value.minTimeZoneOverlapHours as (typeof OVERLAP_HOURS)[number])
    ? props.value.minTimeZoneOverlapHours
    : 2;

  return (
    <View style={styles.form}>
      <TagInput
        label="Target roles"
        values={props.value.targetRoles}
        onChange={(targetRoles) => patch({ targetRoles })}
        testID={TestIds.preferencesForm.targetRoles}
        max={10}
      />
      <SegmentedControl
        label="Work mode"
        multiple
        options={WORK_MODES.map((mode) => ({
          value: mode,
          label: WORK_MODE_LABELS[mode],
          testID: TestIds.preferencesForm.workMode(mode),
        }))}
        selected={props.value.workModes}
        onChange={(workModes) => patch({ workModes: workModes as WorkMode[] })}
      />
      <TagInput
        label="Countries I can work in without a visa"
        values={props.value.workAuthorizedCountries}
        onChange={(workAuthorizedCountries) => patch({ workAuthorizedCountries })}
        testID={TestIds.preferencesForm.authorizedCountries}
        max={50}
        normalize={countryCode}
        helper="2-letter codes, e.g. BD, MY"
      />
      <ToggleRow
        label="Open to visa sponsorship"
        value={props.value.openToSponsorship}
        onValueChange={(openToSponsorship) => patch({ openToSponsorship })}
        testID={TestIds.preferencesForm.sponsorship}
      />
      <View testID={TestIds.preferencesForm.overlap}>
        <SegmentedControl
          label="Minimum time-zone overlap"
          options={OVERLAP_HOURS.map((hours) => ({
            value: String(hours),
            label: `${hours}h`,
            testID: `${TestIds.preferencesForm.overlap}-${hours}`,
          }))}
          selected={[String(overlap)]}
          onChange={(selected) => {
            const hours = Number(selected[0]);
            if (hours === 0 || hours === 2 || hours === 4 || hours === 6) patch({ minTimeZoneOverlapHours: hours });
          }}
        />
      </View>
      <TextField
        label="Minimum yearly salary"
        value={props.value.minSalary === null ? '' : String(props.value.minSalary)}
        onChangeText={(text) => {
          const trimmed = text.trim();
          if (trimmed === '') {
            patch({ minSalary: null });
            return;
          }
          const amount = Number(trimmed);
          if (Number.isFinite(amount)) patch({ minSalary: amount });
        }}
        testID={TestIds.preferencesForm.minSalary}
        keyboardType="numeric"
        helper="Empty means no minimum"
      />
      <TextField
        label="Currency"
        value={props.value.salaryCurrency}
        onChangeText={(salaryCurrency) => patch({ salaryCurrency: salaryCurrency.toUpperCase().slice(0, 3) })}
        testID={TestIds.preferencesForm.currency}
        autoCapitalize="none"
        maxLength={3}
      />
      <TagInput
        label="Companies to avoid"
        values={props.value.blockedCompanies}
        onChange={(blockedCompanies) => patch({ blockedCompanies })}
        testID={TestIds.preferencesForm.blockedCompanies}
        max={50}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
});
