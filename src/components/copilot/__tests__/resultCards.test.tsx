import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { TestIds } from '../../../constants/testIds';
import { lightColors } from '../../../theme/tokens';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import type { Resume } from '../../../types/domain';
import { EligibilityBadge } from '../EligibilityBadge';
import { MatchCard } from '../MatchCard';
import { RedFlagList } from '../RedFlagList';
import { SkillChips } from '../SkillChips';

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  const Icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return {
    CircleCheck: Icon,
    CircleHelp: Icon,
    CircleX: Icon,
    TriangleAlert: Icon,
    ShieldCheck: Icon,
    FileText: Icon,
  };
});

const resume: Resume = {
  id: 1,
  label: 'Backend',
  fileName: 'Alex_Rahman_Backend.pdf',
  fileUri: 'file:///resumes/1.pdf',
  content: { summary: '', skills: [], highlights: [] },
  createdAt: '2026-10-12 08:00:00',
};

function theme(node: ReactElement) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe('result cards', () => {
  it('maps eligibility to label, tone, and accessibility label', async () => {
    const view = await theme(<EligibilityBadge eligibility="ELIGIBLE" reason="Matches the posting." />);
    const badge = screen.getByTestId(TestIds.copilot.eligibilityBadge);
    expect(badge.props.accessibilityLabel).toBe('Eligibility: You can apply');
    const flat = Array.isArray(badge.props.style) ? Object.assign({}, ...badge.props.style) : badge.props.style;
    expect(flat.backgroundColor).toBe(lightColors.successBg);
    expect(screen.getByText('Matches the posting.')).toBeTruthy();

    await view.rerender(
      <ThemeProvider>
        <EligibilityBadge eligibility="NOT_ELIGIBLE" reason="Needs a work permit." />
      </ThemeProvider>,
    );
    expect(screen.getByTestId(TestIds.copilot.eligibilityBadge).props.accessibilityLabel).toBe(
      'Eligibility: Likely not eligible',
    );
  });

  it('lists red-flag titles and the empty state', async () => {
    const view = await theme(
      <RedFlagList flags={[{ code: 'NO_SALARY_INFO', detail: 'The post does not mention pay.' }]} />,
    );
    expect(screen.getByText('No salary listed')).toBeTruthy();
    expect(screen.getByText('The post does not mention pay.')).toBeTruthy();
    expect(screen.getByTestId(TestIds.copilot.redFlag(0))).toBeTruthy();

    await view.rerender(
      <ThemeProvider>
        <RedFlagList flags={[]} />
      </ThemeProvider>,
    );
    expect(screen.getByText('No red flags found')).toBeTruthy();
  });

  it('labels the match score and the missing-resume copy', async () => {
    const view = await theme(<MatchCard score={92} resume={resume} reason="Closest skills." />);
    expect(screen.getByTestId(TestIds.copilot.matchScore).props.accessibilityLabel).toBe('Match 92 percent');
    expect(screen.getByText('Backend')).toBeTruthy();
    expect(screen.getByText('Alex_Rahman_Backend.pdf')).toBeTruthy();

    await view.rerender(
      <ThemeProvider>
        <MatchCard score={0} resume={null} reason="No resume to compare." />
      </ThemeProvider>,
    );
    expect(screen.getByText('Add a resume in Settings to get a recommendation')).toBeTruthy();
    expect(screen.getByTestId(TestIds.copilot.matchScore).props.accessibilityLabel).toBe('Match 0 percent');
  });

  it('labels skill chips and renders nothing when empty', async () => {
    const view = await theme(<SkillChips title="Matched skills" skills={['TypeScript', 'SQL']} testID="matched" />);
    expect(screen.getByTestId('matched').props.accessibilityLabel).toBe('Matched skills: TypeScript, SQL');
    await view.rerender(
      <ThemeProvider>
        <SkillChips title="Missing skills" skills={[]} testID="missing" />
      </ThemeProvider>,
    );
    expect(screen.queryByTestId('missing')).toBeNull();
  });
});
