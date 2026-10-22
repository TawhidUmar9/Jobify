import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { lightColors } from '../../../theme/tokens';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { AnalyzeFab, type AnalyzeFabProps } from '../AnalyzeFab';

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  const Icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return { Sparkles: Icon, Settings2: Icon };
});

async function renderFab(props: Partial<AnalyzeFabProps> = {}) {
  const onPress = jest.fn();
  const view = await render(
    <ThemeProvider>
      <AnalyzeFab onPress={onPress} disabled={false} busy={false} aiMissing={false} {...props} />
    </ThemeProvider>,
  );
  return { onPress, ...view };
}

describe('AnalyzeFab', () => {
  it('shows Analyze, Analyzing, and Set up AI', async () => {
    const idle = await renderFab();
    const fab = screen.getByTestId(TestIds.workspace.analyzeFab);
    expect(screen.getByText('Analyze & Fill')).toBeTruthy();
    expect(fab.props.accessibilityLabel).toBe('Analyze this job page and prepare auto-fill');
    const flat = Array.isArray(fab.props.style) ? Object.assign({}, ...fab.props.style) : fab.props.style;
    expect(flat.backgroundColor).toBe(lightColors.accent);
    await fireEvent.press(fab);
    expect(idle.onPress).toHaveBeenCalled();

    await idle.rerender(
      <ThemeProvider>
        <AnalyzeFab onPress={idle.onPress} disabled busy aiMissing={false} />
      </ThemeProvider>,
    );
    expect(screen.getByText('Analyzing…')).toBeTruthy();
    expect(screen.getByTestId(TestIds.workspace.analyzeFab).props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });

    await idle.rerender(
      <ThemeProvider>
        <AnalyzeFab onPress={idle.onPress} disabled={false} busy={false} aiMissing />
      </ThemeProvider>,
    );
    expect(screen.getByText('Set up AI')).toBeTruthy();
  });
});
