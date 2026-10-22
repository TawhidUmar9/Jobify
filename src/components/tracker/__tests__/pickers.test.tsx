import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { FollowUpPicker, followUpAtFromOption } from '../FollowUpPicker';
import { StatusPicker } from '../StatusPicker';

describe('FollowUpPicker and followUpAtFromOption', () => {
  it('computes pure UTC timestamp from fixed now', () => {
    const fixedNow = new Date('2026-10-23T12:00:00.000Z');
    expect(followUpAtFromOption('3d', fixedNow)).toBe('2026-10-26 12:00:00');
    expect(followUpAtFromOption('1w', fixedNow)).toBe('2026-10-30 12:00:00');
    expect(followUpAtFromOption('2w', fixedNow)).toBe('2026-11-06 12:00:00');
    expect(followUpAtFromOption('none', fixedNow)).toBeNull();
  });

  it('renders follow-up options and selects an option', async () => {
    const onSelect = jest.fn();
    const onCancel = jest.fn();

    await render(
      <ThemeProvider>
        <FollowUpPicker visible={true} onSelect={onSelect} onCancel={onCancel} />
      </ThemeProvider>,
    );

    expect(screen.getByText('Follow-up reminder')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(TestIds.detail.followUpOption('3d')));
    expect(onSelect).toHaveBeenCalledWith('3d');

    await fireEvent.press(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('StatusPicker', () => {
  it('renders statuses, cancels when current status is clicked, selects new status', async () => {
    const onSelect = jest.fn();
    const onCancel = jest.fn();

    await render(
      <ThemeProvider>
        <StatusPicker visible={true} current="APPLIED" onSelect={onSelect} onCancel={onCancel} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId(TestIds.statusPicker.sheet)).toBeTruthy();

    // Clicking current status calls onCancel (no write)
    await fireEvent.press(screen.getByTestId(TestIds.statusPicker.option('APPLIED')));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();

    // Clicking different status calls onSelect
    await fireEvent.press(screen.getByTestId(TestIds.statusPicker.option('INTERVIEWING')));
    expect(onSelect).toHaveBeenCalledWith('INTERVIEWING');

    // Cancel button
    await fireEvent.press(screen.getByTestId(TestIds.statusPicker.cancel));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
