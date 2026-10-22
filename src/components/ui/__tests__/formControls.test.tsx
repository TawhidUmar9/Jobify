import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TestIds } from '../../../constants/testIds';
import { lightColors } from '../../../theme/tokens';
import { ConfirmDialog } from '../ConfirmDialog';
import { SegmentedControl } from '../SegmentedControl';
import { TagInput } from '../TagInput';
import { TextField } from '../TextField';

interface HostNode {
  props: { onRequestClose?: () => void };
  parent: HostNode | null;
}

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  const Icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return { Eye: Icon, EyeOff: Icon, X: Icon, ChevronRight: Icon };
});

const modes = [
  { value: 'REMOTE' as const, label: 'Remote', testID: 'mode-remote' },
  { value: 'HYBRID' as const, label: 'Hybrid', testID: 'mode-hybrid' },
  { value: 'ONSITE' as const, label: 'On-site', testID: 'mode-onsite' },
];

describe('TextField', () => {
  it('shows the label, helper, and error, and puts the error in accessibilityHint', async () => {
    const view = await render(
      <TextField label="Email" value="" onChangeText={jest.fn()} testID="email" helper="Work email" />,
    );
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('Work email')).toBeTruthy();
    expect(screen.getByLabelText('Email').props.accessibilityHint).toBeUndefined();

    await view.rerender(
      <TextField label="Email" value="" onChangeText={jest.fn()} testID="email" helper="Work email" error="Enter an email" />,
    );
    expect(screen.getByText('Enter an email')).toBeTruthy();
    expect(screen.queryByText('Work email')).toBeNull();
    expect(screen.getByLabelText('Email').props.accessibilityHint).toBe('Enter an email');
  });

  it('toggles secureTextEntry from the show/hide control', async () => {
    await render(
      <TextField label="API key" value="secret" onChangeText={jest.fn()} testID="key" secureTextEntry />,
    );
    const user = userEvent.setup();
    expect(screen.getByTestId('key').props.secureTextEntry).toBe(true);
    await user.press(screen.getByLabelText('Show key'));
    expect(screen.getByTestId('key').props.secureTextEntry).toBe(false);
    await user.press(screen.getByLabelText('Hide key'));
    expect(screen.getByTestId('key').props.secureTextEntry).toBe(true);
  });
});

describe('TagInput', () => {
  it('trims, ignores empty and duplicate values, rejects normalize null, and removes a chip', async () => {
    const onChange = jest.fn();
    function Harness({ values }: { values: string[] }) {
      return (
        <TagInput
          label="Skills"
          values={values}
          onChange={onChange}
          testID="skills"
          max={2}
          normalize={(raw) => (raw.toLowerCase() === 'nope' ? null : raw.toUpperCase())}
        />
      );
    }

    const user = userEvent.setup();
    const view = await render(<Harness values={['REACT']} />);
    const input = screen.getByTestId(TestIds.tagInput.input('skills'));

    fireEvent.changeText(input, '   ');
    await user.press(screen.getByTestId(TestIds.tagInput.add('skills')));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.changeText(input, ' react ');
    await user.press(screen.getByTestId(TestIds.tagInput.add('skills')));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.changeText(input, 'nope');
    await user.press(screen.getByTestId(TestIds.tagInput.add('skills')));
    expect(screen.getByText('Not valid')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.changeText(input, ' node ');
    await user.press(screen.getByTestId(TestIds.tagInput.add('skills')));
    expect(onChange).toHaveBeenCalledWith(['REACT', 'NODE']);

    await view.rerender(<Harness values={['REACT', 'NODE']} />);
    await user.press(screen.getByLabelText('Remove REACT'));
    expect(onChange).toHaveBeenCalledWith(['NODE']);
    expect(screen.getByTestId(TestIds.tagInput.add('skills')).props.accessibilityState.disabled).toBe(true);
  });
});

describe('SegmentedControl', () => {
  it('uses radio for single select and checkbox for multi, and keeps the last multi item', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const single = await render(
      <SegmentedControl label="Work mode" options={modes} selected={['REMOTE']} onChange={onChange} />,
    );
    expect(screen.getByTestId('mode-remote').props.accessibilityRole).toBe('radio');
    expect(screen.getByTestId('mode-remote').props.accessibilityState.checked).toBe(true);
    await single.unmount();

    await render(
      <SegmentedControl label="Work mode" options={modes} selected={['REMOTE']} onChange={onChange} multiple />,
    );
    expect(screen.getByTestId('mode-remote').props.accessibilityRole).toBe('checkbox');
    await user.press(screen.getByTestId('mode-remote'));
    expect(onChange).not.toHaveBeenCalled();

    await user.press(screen.getByTestId('mode-hybrid'));
    expect(onChange).toHaveBeenCalledWith(['REMOTE', 'HYBRID']);
  });
});

describe('ConfirmDialog', () => {
  it('cancels on hardware back and uses the danger color when destructive', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    await render(
      <ConfirmDialog
        visible
        title="Delete resume"
        message="This cannot be undone."
        confirmLabel="Delete resume"
        destructive
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    let node: HostNode | null = screen.getByTestId(TestIds.confirmDialog.dialog) as unknown as HostNode;
    let closed = false;
    while (node) {
      const onRequestClose = node.props.onRequestClose as (() => void) | undefined;
      if (onRequestClose) {
        onRequestClose();
        closed = true;
        break;
      }
      node = node.parent;
    }
    expect(closed).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);

    const confirm = screen.getByTestId(TestIds.confirmDialog.confirm);
    const style = StyleSheet.flatten(confirm.props.style) as { backgroundColor?: string };
    expect(style.backgroundColor).toBe(lightColors.dangerIcon);

    await user.press(screen.getByTestId(TestIds.confirmDialog.cancel));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
