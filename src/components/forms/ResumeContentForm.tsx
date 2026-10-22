import { Text, View } from 'react-native';

import type { ResumeContent } from '../../types/domain';

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
  // TODO(T-039): implement per the rules above.
  return (
    <View>
      <Text>{props.label}</Text>
    </View>
  );
}
