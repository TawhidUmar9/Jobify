import { Text, View } from 'react-native';

export interface SkillChipsProps {
  title: 'Matched skills' | 'Missing skills';
  skills: string[];
  testID: string;
}

/**
 * Non-interactive wrapped chips (height 28, outlined borderStrong, caption). Empty → nothing.
 * Container accessibilityLabel `${title}: ${skills.join(', ')}`.
 */
export function SkillChips({ title, skills, testID }: SkillChipsProps) {
  // TODO(T-029): implement per the rules above.
  if (skills.length === 0) return null;
  return (
    <View testID={testID}>
      <Text>
        {title}: {skills.join(', ')}
      </Text>
    </View>
  );
}
