import { render, screen } from '@testing-library/react-native';

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

  it('renders empty state when total is 0', async () => {
    mockStatus = 'ready';
    mockSummary = {
      ...fullSummary,
      total: 0,
      applied: 0,
      responses: 0,
      interviews: 0,
    };

    await render(
      <ThemeProvider>
        <InsightsScreen />
      </ThemeProvider>,
    );

    expect(screen.getByTestId(TestIds.insights.empty)).toBeTruthy();
    expect(screen.getByText('No data yet')).toBeTruthy();
  });

  it('renders full insights when data exists', async () => {
    mockStatus = 'ready';
    mockSummary = fullSummary;

    await render(
      <ThemeProvider>
        <InsightsScreen />
      </ThemeProvider>,
    );

    expect(screen.getByTestId(TestIds.insights.screen)).toBeTruthy();
    expect(screen.getByTestId(TestIds.insights.total)).toBeTruthy();
    expect(screen.getByTestId(TestIds.insights.responseRate)).toBeTruthy();
    expect(screen.getByTestId(TestIds.insights.interviewRate)).toBeTruthy();
    expect(screen.getByTestId(TestIds.insights.weekly)).toBeTruthy();
    expect(screen.getByTestId(TestIds.insights.byResume)).toBeTruthy();
    expect(screen.getByTestId(TestIds.insights.byBoard)).toBeTruthy();
    expect(
      screen.getByText('Response = interview, offer or rejection. Calculated on this device.'),
    ).toBeTruthy();
  });
});
