import { render, screen, within } from '@testing-library/react-native';

import { TestIds } from '../../constants/testIds';
import { ThemeProvider } from '../../theme/ThemeProvider';
import type { InsightsSummary } from '../../types/domain';
import InsightsScreen from '../insights';

let mockStatus = 'ready';
let mockSummary: InsightsSummary | null = null;
const mockReload = jest.fn();

jest.mock('../../features/insights/useInsights', () => ({
  useInsights: () => ({
    status: mockStatus,
    summary: mockSummary,
    reload: mockReload,
  }),
}));

const fullSummary: InsightsSummary = {
  total: 42,
  applied: 40,
  responses: 8,
  interviews: 4,
  byStatus: { SAVED: 2, APPLIED: 28, INTERVIEWING: 4, OFFER: 1, REJECTED: 5, WITHDRAWN: 2 },
  byResume: [{ key: 'Backend', applied: 30, responses: 6, interviews: 3 }],
  byBoard: [{ key: 'LinkedIn', applied: 40, responses: 8, interviews: 4 }],
  appliedPerWeek: [
    { weekStart: '2026-09-01', count: 0 },
    { weekStart: '2026-09-08', count: 1 },
    { weekStart: '2026-09-15', count: 2 },
    { weekStart: '2026-09-22', count: 3 },
    { weekStart: '2026-09-29', count: 0 },
    { weekStart: '2026-10-06', count: 5 },
    { weekStart: '2026-10-13', count: 2 },
    { weekStart: '2026-10-20', count: 4 },
  ],
};

describe('InsightsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when applied is 0 even if saved jobs exist (T-046f G4)', async () => {
    mockStatus = 'ready';
    mockSummary = {
      ...fullSummary,
      total: 1,
      applied: 0,
      responses: 0,
      interviews: 0,
      byStatus: { ...fullSummary.byStatus, SAVED: 1, APPLIED: 0 },
    };

    await render(
      <ThemeProvider>
        <InsightsScreen />
      </ThemeProvider>,
    );

    expect(screen.getByTestId(TestIds.insights.empty)).toBeTruthy();
    expect(screen.getByText('No data yet')).toBeTruthy();
  });

  it('renders full insights when data exists, showing applied count and saved caption (T-046f G4)', async () => {
    mockStatus = 'ready';
    mockSummary = fullSummary;

    await render(
      <ThemeProvider>
        <InsightsScreen />
      </ThemeProvider>,
    );

    expect(screen.getByTestId(TestIds.insights.screen)).toBeTruthy();
    const totalTile = screen.getByTestId(TestIds.insights.total);
    expect(totalTile).toBeTruthy();
    // Applications tile must show applied (40), not total (42)
    expect(within(totalTile).getByText('40')).toBeTruthy();
    expect(within(totalTile).queryByText('42')).toBeNull();
    // Saved caption: "2 saved for later"
    expect(within(totalTile).getByText('2 saved for later')).toBeTruthy();
    expect(totalTile.props.accessibilityLabel).toBe('Applications: 40, 2 saved for later');

    expect(screen.getByTestId(TestIds.insights.responseRate)).toBeTruthy();
    expect(screen.getByTestId(TestIds.insights.interviewRate)).toBeTruthy();
    expect(screen.getByTestId(TestIds.insights.weekly)).toBeTruthy();
    expect(screen.getByTestId(TestIds.insights.byResume)).toBeTruthy();
    expect(screen.getByTestId(TestIds.insights.byBoard)).toBeTruthy();
    expect(
      screen.getByText('Response = interview, offer or rejection. Calculated on this device.'),
    ).toBeTruthy();
  });

  it('shows singular "1 saved for later" and hides caption when 0 saved (T-046f G4)', async () => {
    mockStatus = 'ready';
    mockSummary = {
      ...fullSummary,
      byStatus: { ...fullSummary.byStatus, SAVED: 1 },
    };

    const view = await render(
      <ThemeProvider>
        <InsightsScreen />
      </ThemeProvider>,
    );

    const totalTile = screen.getByTestId(TestIds.insights.total);
    expect(within(totalTile).getByText('1 saved for later')).toBeTruthy();
    expect(totalTile.props.accessibilityLabel).toBe('Applications: 40, 1 saved for later');

    mockSummary = {
      ...fullSummary,
      byStatus: { ...fullSummary.byStatus, SAVED: 0 },
    };

    await view.rerender(
      <ThemeProvider>
        <InsightsScreen />
      </ThemeProvider>,
    );

    expect(screen.queryByText(/saved for later/)).toBeNull();
  });
});
