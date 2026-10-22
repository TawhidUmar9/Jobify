import { StyleSheet, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { spacing } from '../../theme/tokens';
import type { ResumeContent } from '../../types/domain';
import { TagInput } from '../ui/TagInput';
import { TextField } from '../ui/TextField';

export interface ResumeContentFormProps {
  label: string;
  onLabelChange: (label: string) => void;
  value: ResumeContent;
  onChange: (value: ResumeContent) => void;
  labelError: string | null;
}

/**
 * Edit one resume version: Label (TextField max 40), Summary (multiline), Skills (TagInput max 50),
 * Highlights (TagInput max 10, helper "Your strongest achievements; used for scoring and rewrites").
 */
export function ResumeContentForm(props: ResumeContentFormProps) {
  return (
    <View style={styles.form}>
      <TextField
        label="Resume label"
        value={props.label}
        onChangeText={props.onLabelChange}
        maxLength={40}
        error={props.labelError ?? undefined}
        testID={TestIds.resumeImport.label}
        autoCapitalize="words"
      />
      <TextField
        label="Summary"
        value={props.value.summary}
        onChangeText={(summary) => props.onChange({ ...props.value, summary })}
        multiline
        numberOfLines={4}
        testID="resume-form-summary"
      />
      <TagInput
        label="Skills"
        values={props.value.skills}
        onChange={(skills) => props.onChange({ ...props.value, skills })}
        max={50}
        testID="resume-form-skills"
      />
      <TagInput
        label="Highlights"
        values={props.value.highlights}
        onChange={(highlights) => props.onChange({ ...props.value, highlights })}
        max={10}
        helper="Your strongest achievements; used for scoring and rewrites"
        testID="resume-form-highlights"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
});
