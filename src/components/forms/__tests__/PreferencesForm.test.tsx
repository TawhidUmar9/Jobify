import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { TestIds } from '../../../constants/testIds';
import { DEFAULT_PREFERENCES, type JobPreferences } from '../../../types/domain';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { PreferencesForm } from '../PreferencesForm';

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  const Icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return { X: Icon, Eye: Icon, EyeOff: Icon };
});

function Harness({ initial = DEFAULT_PREFERENCES }: { initial?: JobPreferences }) {
  const [value, setValue] = useState(initial);
  return (
    <ThemeProvider>
      <PreferencesForm value={value} onChange={setValue} />
    </ThemeProvider>
  );
}

describe('PreferencesForm', () => {
  it('normalizes country codes to upper-case letters and rejects anything else', async () => {
    await render(<Harness />);
    const input = screen.getByTestId(TestIds.tagInput.input(TestIds.preferencesForm.authorizedCountries));
    await fireEvent.changeText(input, 'bd');
    await fireEvent.press(screen.getByTestId(TestIds.tagInput.add(TestIds.preferencesForm.authorizedCountries)));
    expect(screen.getByText('BD')).toBeTruthy();

    await fireEvent.changeText(input, 'Bangladesh');
    await fireEvent.press(screen.getByTestId(TestIds.tagInput.add(TestIds.preferencesForm.authorizedCountries)));
    expect(screen.getByText('Not valid')).toBeTruthy();
  });

  it('edits work mode, overlap, and an empty salary', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByTestId(TestIds.preferencesForm.workMode('HYBRID')));
    expect(screen.getByTestId(TestIds.preferencesForm.workMode('HYBRID')).props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId(TestIds.preferencesForm.workMode('REMOTE')).props.accessibilityState.checked).toBe(true);

    await fireEvent.press(screen.getByTestId(`${TestIds.preferencesForm.overlap}-0`));
    expect(screen.getByTestId(`${TestIds.preferencesForm.overlap}-0`).props.accessibilityState.checked).toBe(true);

    await fireEvent.changeText(screen.getByTestId(TestIds.preferencesForm.minSalary), '50000');
    expect(screen.getByTestId(TestIds.preferencesForm.minSalary).props.value).toBe('50000');
    await fireEvent.changeText(screen.getByTestId(TestIds.preferencesForm.minSalary), '');
    expect(screen.getByTestId(TestIds.preferencesForm.minSalary).props.value).toBe('');

    await fireEvent.changeText(screen.getByTestId(TestIds.preferencesForm.currency), 'bdt');
    expect(screen.getByTestId(TestIds.preferencesForm.currency).props.value).toBe('BDT');
  });
});
