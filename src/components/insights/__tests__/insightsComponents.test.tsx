import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../../../theme/ThemeProvider';
import { RateTable } from '../RateTable';
import { StatTile } from '../StatTile';
import { WeeklyBars } from '../WeeklyBars';

describe('StatTile', () => {
  it('renders label, value, caption, and accessible label', async () => {
    await render(
      <ThemeProvider>
        <StatTile
          label="Response rate"
          value="18%"
          caption="8 of 42"
          testID="test-tile"
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('test-tile')).toBeTruthy();
    expect(screen.getByText('18%')).toBeTruthy();
    expect(screen.getByText('Response rate')).toBeTruthy();
    expect(screen.getByText('8 of 42')).toBeTruthy();
    expect(screen.getByTestId('test-tile').props.accessibilityLabel).toBe(
      'Response rate: 18%, 8 of 42',
    );
  });
});

describe('RateTable', () => {
  it('returns null if rows is empty', async () => {
    const { toJSON } = await render(
      <ThemeProvider>
        <RateTable title="By resume" rows={[]} testID="empty-table" />
      </ThemeProvider>,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders rows with percentages when applied >= 3, and "Too few to compare" when applied < 3', async () => {
    await render(
      <ThemeProvider>
        <RateTable
          title="By resume"
          rows={[
            { key: 'Backend', applied: 10, responses: 2, interviews: 1 },
            { key: 'Frontend', applied: 2, responses: 1, interviews: 0 },
          ]}
          testID="rate-table"
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('rate-table')).toBeTruthy();
    expect(screen.getByText('Backend')).toBeTruthy();
    expect(screen.getByText('20%')).toBeTruthy();
    expect(screen.getByText('10%')).toBeTruthy();

    expect(screen.getByText('Frontend')).toBeTruthy();
    expect(screen.getByText('Too few to compare')).toBeTruthy();
  });
});

describe('WeeklyBars', () => {
  const weeks = [
    { weekStart: '2026-09-01', count: 0 },
    { weekStart: '2026-09-08', count: 1 },
    { weekStart: '2026-09-15', count: 2 },
    { weekStart: '2026-09-22', count: 3 },
    { weekStart: '2026-09-29', count: 0 },
    { weekStart: '2026-10-06', count: 5 },
    { weekStart: '2026-10-13', count: 2 },
    { weekStart: '2026-10-20', count: 4 },
  ];

  it('renders 8 bars and shows tooltip on tap', async () => {
    await render(
      <ThemeProvider>
        <WeeklyBars weeks={weeks} testID="weekly-bars" />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('weekly-bars')).toBeTruthy();
    const currentWeekButton = screen.getByLabelText('20 Oct: 4 applications');
    expect(currentWeekButton).toBeTruthy();
    expect(screen.getByLabelText('8 Sep: 1 application')).toBeTruthy();

    // Tap bar to show tooltip
    await fireEvent.press(currentWeekButton);
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('shows zero caption when all counts are 0', async () => {
    const zeroWeeks = weeks.map((w) => ({ ...w, count: 0 }));
    await render(
      <ThemeProvider>
        <WeeklyBars weeks={zeroWeeks} testID="weekly-bars" />
      </ThemeProvider>,
    );

    expect(screen.getByText('No applications in the last 8 weeks')).toBeTruthy();
  });
});
