import { Switch, Text, View } from 'react-native';

export interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID: string;
}

/** Row with label (+ description) and a native Switch. Whole row toggles; min height 56; role "switch". */
export function ToggleRow(props: ToggleRowProps) {
  // TODO(T-003): implement (colors: track primary when on).
  return (
    <View>
      <Text>{props.label}</Text>
      <Switch testID={props.testID} value={props.value} onValueChange={props.onValueChange} accessibilityLabel={props.label} />
    </View>
  );
}
