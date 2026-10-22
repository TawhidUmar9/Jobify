import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { lightColors } from '../../../theme/tokens';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import type { JobBoard } from '../../../types/domain';
import { BoardBar } from '../BoardBar';

const linkedIn: JobBoard = { id: 1, name: 'LinkedIn', url: 'https://www.linkedin.com', lastVisitedUrl: null, sortOrder: 0 };

async function renderBar(boards: JobBoard[], activeBoardId: number | null = 1) {
  const onSelect = jest.fn();
  const view = await render(
    <ThemeProvider>
      <BoardBar boards={boards} activeBoardId={activeBoardId} onSelect={onSelect} />
    </ThemeProvider>,
  );
  return { onSelect, ...view };
}

describe('BoardBar', () => {
  it('renders nothing when there are no boards', async () => {
    await renderBar([]);
    expect(screen.queryByTestId(TestIds.workspace.boardBar)).toBeNull();
  });

  it('exposes tab roles and labels and reports the pressed board', async () => {
    const { onSelect } = await renderBar([linkedIn]);
    const pill = screen.getByTestId(TestIds.workspace.boardPill(1));
    expect(screen.getByTestId(TestIds.workspace.boardBar).props.accessibilityRole).toBe('tablist');
    expect(pill.props.accessibilityRole).toBe('tab');
    expect(pill.props.accessibilityLabel).toBe('LinkedIn job board');
    expect(pill.props.accessibilityState).toEqual({ selected: true });
    const flat = Array.isArray(pill.props.style) ? Object.assign({}, ...pill.props.style) : pill.props.style;
    expect(flat.backgroundColor).toBe(lightColors.primary);
    await fireEvent.press(pill);
    expect(onSelect).toHaveBeenCalledWith(linkedIn);
  });
});
