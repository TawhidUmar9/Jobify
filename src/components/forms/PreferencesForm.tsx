import { Text, View } from 'react-native';

import type { JobPreferences } from '../../types/domain';

export interface PreferencesFormProps {
  value: JobPreferences;
  onChange: (value: JobPreferences) => void;
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
  // TODO(T-020): implement per the rules above.
  return (
    <View>
      <Text>{props.value.targetRoles.join(', ')}</Text>
    </View>
  );
}
