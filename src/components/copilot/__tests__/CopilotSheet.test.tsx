import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { initialWorkspaceState, type WorkspaceError, type WorkspaceState } from '../../../features/workspace/workspaceReducer';
import { AI_ERROR_MESSAGES, type AiErrorCode } from '../../../services/ai/types';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import type { JobAnalysis } from '../../../types/domain';
import { CopilotSheet } from '../CopilotSheet';

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  const Icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return {
    RefreshCw: Icon,
    X: Icon,
    CircleCheck: Icon,
    CircleHelp: Icon,
    CircleX: Icon,
    TriangleAlert: Icon,
    ShieldCheck: Icon,
    FileText: Icon,
    FileQuestion: Icon,
  };
});

const analysis: JobAnalysis = {
  isJobPosting: true,
  companyName: 'Acme Cloud',
  roleTitle: 'Backend engineer',
  eligibility: 'ELIGIBLE',
  eligibilityReason: 'Matches the posting.',
  redFlags: [],
  matchScore: 70,
  recommendedResumeId: null,
  resumeReason: 'Main resume',
  matchedSkills: ['TypeScript'],
  missingSkills: ['Go'],
  fieldMappings: [],
};

function state(partial: Partial<WorkspaceState>): WorkspaceState {
  return { ...initialWorkspaceState, sheetOpen: true, ...partial };
}

const handlers = {
  recommendedResume: null,
  isOnSourcePage: true,
  staging: false,
  logging: false,
  onClose: jest.fn(),
  onReanalyze: jest.fn(),
  onAutoFill: jest.fn(),
  onTailor: jest.fn(),
  onSaveAnswer: jest.fn(),
  onStageResume: jest.fn(),
  onLogApplication: jest.fn(),
  onCopy: jest.fn(),
  onOpenSettings: jest.fn(),
};

async function renderSheet(next: WorkspaceState) {
  return render(
    <ThemeProvider>
      <CopilotSheet state={next} {...handlers} />
    </ThemeProvider>,
  );
}

describe('CopilotSheet', () => {
  beforeEach(() => {
    handlers.onReanalyze.mockClear();
    handlers.onOpenSettings.mockClear();
    handlers.onClose.mockClear();
  });

  it('shows scraping and analyzing copy and disables re-analyze while busy', async () => {
    const view = await renderSheet(state({ phase: 'scraping' }));
    expect(screen.getByText('Reading the page…')).toBeTruthy();
    expect(screen.getByTestId(TestIds.copilot.reanalyze).props.accessibilityState).toEqual({ disabled: true });
    await view.rerender(
      <ThemeProvider>
        <CopilotSheet state={state({ phase: 'analyzing' })} {...handlers} />
      </ThemeProvider>,
    );
    expect(screen.getByText('Asking the AI…')).toBeTruthy();
  });

  it('uses the exact error copy and settings actions', async () => {
    const cases: WorkspaceError[] = [
      { kind: 'NO_CONTENT' },
      { kind: 'SCRAPE', code: 'TIMEOUT' },
      { kind: 'SCRAPE', code: 'SCRIPT_ERROR' },
      { kind: 'NO_PROFILE' },
      { kind: 'AI', code: 'RATE_LIMITED' },
      { kind: 'AI', code: 'AUTH' },
      { kind: 'AI', code: 'NOT_CONFIGURED' },
      { kind: 'AI', code: 'MODEL_NOT_FOUND' },
      { kind: 'AI', code: 'BAD_REQUEST' },
      { kind: 'AI', code: 'NETWORK' },
    ];
    const expected: Record<string, { title: string; message: string; action?: string }> = {
      NO_CONTENT: {
        title: 'Not enough text on this page',
        message: 'Open a job post or application form, then analyze again.',
      },
      'SCRAPE:TIMEOUT': { title: "Couldn't read this page", message: 'The page did not respond in 5 seconds.' },
      'SCRAPE:SCRIPT_ERROR': { title: "Couldn't read this page", message: 'This page blocked the reader.' },
      NO_PROFILE: {
        title: 'Add your profile first',
        message: 'Jobify needs your profile to judge fit and fill forms.',
        action: 'Open profile',
      },
    };
    const view = await renderSheet(state({ phase: 'idle' }));
    for (const error of cases) {
      const key = error.kind === 'AI' || error.kind === 'SCRAPE' ? `${error.kind}:${error.code}` : error.kind;
      const copy =
        error.kind === 'AI'
          ? {
              title: 'Analysis failed',
              message: AI_ERROR_MESSAGES[error.code],
              action: (['NOT_CONFIGURED', 'AUTH', 'MODEL_NOT_FOUND', 'BAD_REQUEST'] as AiErrorCode[]).includes(error.code)
                ? 'Open AI settings'
                : undefined,
            }
          : expected[key];
      await view.rerender(
        <ThemeProvider>
          <CopilotSheet state={state({ phase: 'error', error })} {...handlers} />
        </ThemeProvider>,
      );
      expect(screen.getByText(copy?.title ?? '')).toBeTruthy();
      expect(screen.getByTestId(TestIds.copilot.errorMessage).props.children).toBe(copy?.message);
      if (copy?.action) {
        await fireEvent.press(screen.getByText(copy.action));
        expect(handlers.onOpenSettings).toHaveBeenCalled();
        handlers.onOpenSettings.mockClear();
      } else {
        expect(screen.queryByTestId(TestIds.copilot.errorAction)).toBeNull();
      }
    }
    await fireEvent.press(screen.getByTestId(TestIds.copilot.retry));
    expect(handlers.onReanalyze).toHaveBeenCalled();
  });

  it('renders the result stubs and the stale notice off the source page', async () => {
    await render(
      <ThemeProvider>
        <CopilotSheet
          {...handlers}
          isOnSourcePage={false}
          state={state({
            phase: 'ready',
            session: {
              analysis,
              sourceUrl: 'https://example.com/job',
              boardName: 'LinkedIn',
              scrapedInputCount: 0,
              pageText: 'a'.repeat(200),
            },
          })}
        />
      </ThemeProvider>,
    );
    expect(screen.getByText('You can apply')).toBeTruthy();
    expect(screen.getByTestId(TestIds.copilot.staleNotice)).toBeTruthy();
    expect(screen.getByTestId(TestIds.copilot.reanalyze).props.accessibilityState).toEqual({ disabled: false });
  });

  it('renders only NotJobPostCard when isJobPosting is false (D-008)', async () => {
    const notJobAnalysis: JobAnalysis = {
      ...analysis,
      isJobPosting: false,
    };
    await render(
      <ThemeProvider>
        <CopilotSheet
          {...handlers}
          isOnSourcePage={true}
          state={state({
            phase: 'ready',
            session: {
              analysis: notJobAnalysis,
              sourceUrl: 'https://example.com/login',
              boardName: 'LinkedIn',
              scrapedInputCount: 0,
              pageText: 'Please log in to continue.',
            },
          })}
        />
      </ThemeProvider>,
    );
    expect(screen.getByTestId(TestIds.copilot.notJob)).toBeTruthy();
    expect(screen.getByText("This doesn't look like a job post")).toBeTruthy();
    expect(
      screen.getByText(
        "Open a single job and tap Analyze again. Login pages, search results and home pages can't be checked.",
      ),
    ).toBeTruthy();
    expect(screen.queryByTestId(TestIds.copilot.tailorButton)).toBeNull();
    expect(screen.queryByTestId(TestIds.copilot.eligibilityBadge)).toBeNull();
  });
});
