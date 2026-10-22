import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import type { JobBoard } from '../../../types/domain';
import BoardsSettingsScreen from '../boards';

const mockDb = createFakeDb();

jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    cb();
  },
}));

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb.db,
}));

const mockShow = jest.fn();
jest.mock('../../../components/ui/Snackbar', () => ({
  useSnackbar: () => ({ show: (msg: string) => mockShow(msg) }),
}));

let mockBoards: JobBoard[] = [];
const mockAddBoard = jest.fn();
const mockUpdateBoard = jest.fn();
const mockDeleteBoard = jest.fn();
const mockReorderBoards = jest.fn();

jest.mock('../../../db/repositories/boardsRepo', () => ({
  listBoards: jest.fn(async () => mockBoards),
  addBoard: (...args: unknown[]) => mockAddBoard(...args),
  updateBoard: (...args: unknown[]) => mockUpdateBoard(...args),
  deleteBoard: (...args: unknown[]) => mockDeleteBoard(...args),
  reorderBoards: (...args: unknown[]) => mockReorderBoards(...args),
}));

describe('BoardsSettingsScreen', () => {
  const sampleBoards: JobBoard[] = [
    { id: 1, name: 'LinkedIn', url: 'https://linkedin.com/jobs', lastVisitedUrl: null, sortOrder: 0 },
    { id: 2, name: 'Wellfound', url: 'https://wellfound.com/jobs', lastVisitedUrl: null, sortOrder: 1 },
  ];

  beforeEach(() => {
    mockShow.mockClear();
    mockAddBoard.mockClear();
    mockUpdateBoard.mockClear();
    mockDeleteBoard.mockClear();
    mockReorderBoards.mockClear();
    mockBoards = [];
  });

  it('renders empty state when there are no job boards', async () => {
    await render(
      <ThemeProvider>
        <BoardsSettingsScreen />
      </ThemeProvider>,
    );

    expect(await screen.findByText('No job boards')).toBeTruthy();
    expect(screen.getByTestId(TestIds.boards.add)).toBeTruthy();
  });

  it('lists boards with host name, disabled end buttons, and allows reordering', async () => {
    mockBoards = [...sampleBoards];

    await render(
      <ThemeProvider>
        <BoardsSettingsScreen />
      </ThemeProvider>,
    );

    expect(await screen.findByText('LinkedIn')).toBeTruthy();
    expect(screen.getByText('linkedin.com')).toBeTruthy();
    expect(screen.getByText('Wellfound')).toBeTruthy();
    expect(screen.getByText('wellfound.com')).toBeTruthy();

    const upFirst = screen.getByTestId(TestIds.boards.moveUp(1));
    expect(upFirst.props.accessibilityState.disabled).toBe(true);

    const downSecond = screen.getByTestId(TestIds.boards.moveDown(2));
    expect(downSecond.props.accessibilityState.disabled).toBe(true);

    const downFirst = screen.getByTestId(TestIds.boards.moveDown(1));
    expect(downFirst.props.accessibilityState.disabled).toBe(false);

    await fireEvent.press(downFirst);
    expect(mockReorderBoards).toHaveBeenCalledWith(mockDb.db, [2, 1]);
  });

  it('deletes a board after confirmation', async () => {
    mockBoards = [...sampleBoards];
    mockDeleteBoard.mockResolvedValueOnce(undefined);

    await render(
      <ThemeProvider>
        <BoardsSettingsScreen />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId(TestIds.boards.delete(1)));
    expect(screen.getByText('Delete LinkedIn?')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(TestIds.confirmDialog.confirm));
    expect(mockDeleteBoard).toHaveBeenCalledWith(mockDb.db, 1);
    expect(mockShow).toHaveBeenCalledWith('Board deleted');
  });

  it('adds a new board via form', async () => {
    mockBoards = [...sampleBoards];
    mockAddBoard.mockResolvedValueOnce({
      ok: true,
      value: { id: 3, name: 'RemoteOK', url: 'https://remoteok.com', sortOrder: 2 },
    });

    await render(
      <ThemeProvider>
        <BoardsSettingsScreen />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId(TestIds.boards.add));
    expect(screen.getByText('Add job board')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId(TestIds.boards.formName), 'RemoteOK');
    await fireEvent.changeText(screen.getByTestId(TestIds.boards.formUrl), 'remoteok.com');
    await fireEvent.press(screen.getByTestId(TestIds.boards.formSave));

    expect(mockAddBoard).toHaveBeenCalledWith(mockDb.db, {
      name: 'RemoteOK',
      url: 'https://remoteok.com',
    });
    expect(mockShow).toHaveBeenCalledWith('Board saved');
  });

  it('edits a board on row tap', async () => {
    mockBoards = [...sampleBoards];
    mockUpdateBoard.mockResolvedValueOnce({
      ok: true,
      value: { ...sampleBoards[0], name: 'LinkedIn Global' },
    });

    await render(
      <ThemeProvider>
        <BoardsSettingsScreen />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId(TestIds.boards.row(1)));
    expect(screen.getByText('Edit job board')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId(TestIds.boards.formName), 'LinkedIn Global');
    await fireEvent.press(screen.getByTestId(TestIds.boards.formSave));

    expect(mockUpdateBoard).toHaveBeenCalledWith(mockDb.db, 1, {
      name: 'LinkedIn Global',
      url: 'https://linkedin.com/jobs',
    });
    expect(mockShow).toHaveBeenCalledWith('Board saved');
  });
});
