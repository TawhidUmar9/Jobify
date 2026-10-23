import type { PageScrapedMessage } from '../../../bridge/messages';
import { SCRAPE_LIMITS } from '../../../bridge/messages';
import type { AnalysisSession, TailorResult } from '../../../types/domain';
import {
  initialWorkspaceState,
  workspaceReducer,
  type WorkspacePhase,
  type WorkspaceState,
} from '../workspaceReducer';

const mapping = {
  clawId: 'jobify-field-0',
  fieldLabel: 'Name',
  value: 'Alex Rahman',
  source: 'PROFILE' as const,
};

function session(fieldMappings = [mapping]): AnalysisSession {
  return {
    analysis: {
      isJobPosting: true,
      companyName: 'Acme Cloud',
      roleTitle: 'Backend engineer',
      eligibility: 'ELIGIBLE',
      eligibilityReason: 'Matches the posting.',
      redFlags: [],
      matchScore: 80,
      recommendedResumeId: 1,
      resumeReason: 'Main',
      matchedSkills: ['TypeScript'],
      missingSkills: [],
      fieldMappings,
    },
    sourceUrl: 'https://example.com/job',
    boardName: 'LinkedIn',
    scrapedInputCount: fieldMappings.length,
    pageText: 'x'.repeat(SCRAPE_LIMITS.minPageTextChars),
  };
}

function scraped(length: number): PageScrapedMessage {
  return {
    type: 'PAGE_SCRAPED',
    url: 'https://example.com/job',
    title: 'Job',
    pageText: 'a'.repeat(length),
    inputs: [],
  };
}

const tailorResult: TailorResult = {
  emphasize: ['Shipped APIs'],
  bulletRewrites: [],
  coverNote: 'Hello',
  coldDm: 'Hi',
};

function withPhase(phase: WorkspacePhase, extra: Partial<WorkspaceState> = {}): WorkspaceState {
  return { ...initialWorkspaceState, phase, ...extra };
}

describe('workspaceReducer', () => {
  it('ANALYZE_REQUESTED starts a scrape from idle, ready, and error and resets the session', () => {
    for (const phase of ['idle', 'ready', 'error'] as const) {
      const next = workspaceReducer(
        withPhase(phase, {
          sheetOpen: false,
          session: session(),
          error: { kind: 'NO_PROFILE' },
          lastFill: { filledCount: 1, missingCount: 1 },
          loggedApplicationId: 4,
          tailor: { status: 'ready', result: tailorResult },
          savedAnswerClawIds: ['jobify-field-0'],
        }),
        { type: 'ANALYZE_REQUESTED' },
      );
      expect(next).toEqual({
        phase: 'scraping',
        sheetOpen: true,
        session: null,
        error: null,
        lastFill: null,
        loggedApplicationId: null,
        tailor: { status: 'idle' },
        savedAnswerClawIds: [],
      });
    }
    for (const phase of ['scraping', 'analyzing', 'filling'] as const) {
      const current = withPhase(phase);
      expect(workspaceReducer(current, { type: 'ANALYZE_REQUESTED' })).toBe(current);
    }
  });

  it('SCRAPE_SUCCEEDED moves to analyzing at 200 characters and NO_CONTENT below that', () => {
    const scraping = withPhase('scraping', { sheetOpen: true });
    expect(workspaceReducer(scraping, { type: 'SCRAPE_SUCCEEDED', message: scraped(200) }).phase).toBe('analyzing');
    const short = workspaceReducer(scraping, { type: 'SCRAPE_SUCCEEDED', message: scraped(199) });
    expect(short.phase).toBe('error');
    expect(short.error).toEqual({ kind: 'NO_CONTENT' });
    const idle = initialWorkspaceState;
    expect(workspaceReducer(idle, { type: 'SCRAPE_SUCCEEDED', message: scraped(200) })).toBe(idle);
  });

  it('SCRAPE_FAILED records a scrape error only while scraping', () => {
    const scraping = withPhase('scraping', { sheetOpen: true });
    const next = workspaceReducer(scraping, { type: 'SCRAPE_FAILED', code: 'TIMEOUT' });
    expect(next.phase).toBe('error');
    expect(next.error).toEqual({ kind: 'SCRAPE', code: 'TIMEOUT' });
    expect(workspaceReducer(initialWorkspaceState, { type: 'SCRAPE_FAILED', code: 'SCRIPT_ERROR' })).toBe(
      initialWorkspaceState,
    );
  });

  it('PROFILE_MISSING is an error only while analyzing', () => {
    const analyzing = withPhase('analyzing', { sheetOpen: true });
    const next = workspaceReducer(analyzing, { type: 'PROFILE_MISSING' });
    expect(next).toMatchObject({ phase: 'error', error: { kind: 'NO_PROFILE' } });
    expect(workspaceReducer(initialWorkspaceState, { type: 'PROFILE_MISSING' })).toBe(initialWorkspaceState);
  });

  it('ANALYSIS_SUCCEEDED stores the session and becomes ready', () => {
    const analyzing = withPhase('analyzing', { sheetOpen: true });
    const ready = workspaceReducer(analyzing, { type: 'ANALYSIS_SUCCEEDED', session: session() });
    expect(ready.phase).toBe('ready');
    expect(ready.session?.boardName).toBe('LinkedIn');
    expect(workspaceReducer(initialWorkspaceState, { type: 'ANALYSIS_SUCCEEDED', session: session() })).toBe(
      initialWorkspaceState,
    );
  });

  it('ANALYSIS_FAILED stores the AI code only while analyzing', () => {
    const analyzing = withPhase('analyzing', { sheetOpen: true });
    const next = workspaceReducer(analyzing, { type: 'ANALYSIS_FAILED', code: 'RATE_LIMITED' });
    expect(next).toMatchObject({ phase: 'error', error: { kind: 'AI', code: 'RATE_LIMITED' } });
    const ready = withPhase('ready', { session: session() });
    expect(workspaceReducer(ready, { type: 'ANALYSIS_FAILED', code: 'NETWORK' })).toBe(ready);
  });

  it('FILL_REQUESTED requires a ready session with mappings', () => {
    const ready = withPhase('ready', { session: session(), sheetOpen: true });
    expect(workspaceReducer(ready, { type: 'FILL_REQUESTED' }).phase).toBe('filling');
    const empty = withPhase('ready', { session: session([]), sheetOpen: true });
    expect(workspaceReducer(empty, { type: 'FILL_REQUESTED' })).toBe(empty);
    expect(workspaceReducer(initialWorkspaceState, { type: 'FILL_REQUESTED' })).toBe(initialWorkspaceState);
  });

  it('FILL_COMPLETED returns to ready with the fill summary', () => {
    const filling = withPhase('filling', { session: session(), sheetOpen: true });
    const next = workspaceReducer(filling, { type: 'FILL_COMPLETED', filledCount: 2, missingCount: 1 });
    expect(next.phase).toBe('ready');
    expect(next.lastFill).toEqual({ filledCount: 2, missingCount: 1 });
    expect(workspaceReducer(initialWorkspaceState, { type: 'FILL_COMPLETED', filledCount: 1, missingCount: 0 })).toBe(
      initialWorkspaceState,
    );
  });

  it('FILL_FAILED returns to ready and counts every mapping as missing', () => {
    const filling = withPhase('filling', { session: session([mapping, { ...mapping, clawId: 'jobify-field-1' }]) });
    const next = workspaceReducer(filling, { type: 'FILL_FAILED' });
    expect(next.phase).toBe('ready');
    expect(next.lastFill).toEqual({ filledCount: 0, missingCount: 2 });
  });

  it('TAILOR_REQUESTED loads from ready or filling and ignores a second request', () => {
    const ready = withPhase('ready', { session: session() });
    const loading = workspaceReducer(ready, { type: 'TAILOR_REQUESTED' });
    expect(loading.tailor).toEqual({ status: 'loading' });
    expect(loading.phase).toBe('ready');
    expect(workspaceReducer(loading, { type: 'TAILOR_REQUESTED' })).toBe(loading);
    const filling = withPhase('filling', { session: session() });
    expect(workspaceReducer(filling, { type: 'TAILOR_REQUESTED' }).tailor.status).toBe('loading');
    expect(workspaceReducer(initialWorkspaceState, { type: 'TAILOR_REQUESTED' })).toBe(initialWorkspaceState);
  });

  it('TAILOR_SUCCEEDED and TAILOR_FAILED apply only while tailor is loading', () => {
    const loading = withPhase('ready', { session: session(), tailor: { status: 'loading' } });
    const ready = workspaceReducer(loading, { type: 'TAILOR_SUCCEEDED', result: tailorResult });
    expect(ready.tailor).toEqual({ status: 'ready', result: tailorResult });
    const failed = workspaceReducer(loading, { type: 'TAILOR_FAILED', code: 'TIMEOUT' });
    expect(failed.tailor).toEqual({ status: 'error', code: 'TIMEOUT' });
    const idle = withPhase('ready', { session: session() });
    expect(workspaceReducer(idle, { type: 'TAILOR_SUCCEEDED', result: tailorResult })).toBe(idle);
    expect(workspaceReducer(idle, { type: 'TAILOR_FAILED', code: 'NETWORK' })).toBe(idle);
  });

  it('ANSWER_SAVED appends a claw id once', () => {
    const ready = withPhase('ready', { session: session(), savedAnswerClawIds: [] });
    const once = workspaceReducer(ready, { type: 'ANSWER_SAVED', clawId: 'jobify-field-0' });
    expect(once.savedAnswerClawIds).toEqual(['jobify-field-0']);
    expect(workspaceReducer(once, { type: 'ANSWER_SAVED', clawId: 'jobify-field-0' })).toBe(once);
    const filling = withPhase('filling', { session: session() });
    expect(workspaceReducer(filling, { type: 'ANSWER_SAVED', clawId: 'jobify-field-1' }).savedAnswerClawIds).toEqual([
      'jobify-field-1',
    ]);
    expect(workspaceReducer(initialWorkspaceState, { type: 'ANSWER_SAVED', clawId: 'jobify-field-0' })).toBe(
      initialWorkspaceState,
    );
  });

  it('APPLICATION_LOGGED records the id during ready or filling', () => {
    const ready = withPhase('ready', { session: session() });
    expect(workspaceReducer(ready, { type: 'APPLICATION_LOGGED', applicationId: 9 }).loggedApplicationId).toBe(9);
    const filling = withPhase('filling', { session: session() });
    expect(workspaceReducer(filling, { type: 'APPLICATION_LOGGED', applicationId: 3 }).phase).toBe('filling');
    expect(workspaceReducer(initialWorkspaceState, { type: 'APPLICATION_LOGGED', applicationId: 1 })).toBe(
      initialWorkspaceState,
    );
  });

  it('SHEET_OPENED opens the sheet from ready or error', () => {
    const ready = withPhase('ready', { session: session(), sheetOpen: false });
    expect(workspaceReducer(ready, { type: 'SHEET_OPENED' }).sheetOpen).toBe(true);
    const error = withPhase('error', { error: { kind: 'NO_CONTENT' }, sheetOpen: false });
    expect(workspaceReducer(error, { type: 'SHEET_OPENED' }).sheetOpen).toBe(true);
    const open = withPhase('ready', { session: session(), sheetOpen: true });
    expect(workspaceReducer(open, { type: 'SHEET_OPENED' })).toBe(open);
    expect(workspaceReducer(initialWorkspaceState, { type: 'SHEET_OPENED' })).toBe(initialWorkspaceState);
  });

  it('SHEET_CLOSED drops in-flight work, clears errors, and aborts a loading tailor', () => {
    const scraping = withPhase('scraping', { sheetOpen: true });
    expect(workspaceReducer(scraping, { type: 'SHEET_CLOSED' })).toMatchObject({ phase: 'idle', sheetOpen: false });
    const analyzing = withPhase('analyzing', { sheetOpen: true });
    expect(workspaceReducer(analyzing, { type: 'SHEET_CLOSED' }).phase).toBe('idle');
    const error = withPhase('error', { sheetOpen: true, error: { kind: 'NO_PROFILE' }, session: session() });
    const closedError = workspaceReducer(error, { type: 'SHEET_CLOSED' });
    expect(closedError.phase).toBe('idle');
    expect(closedError.error).toBeNull();
    expect(closedError.session).toBe(error.session);
    const ready = withPhase('ready', {
      sheetOpen: true,
      session: session(),
      tailor: { status: 'loading' },
      loggedApplicationId: 2,
    });
    const closedReady = workspaceReducer(ready, { type: 'SHEET_CLOSED' });
    expect(closedReady.phase).toBe('ready');
    expect(closedReady.session).toBe(ready.session);
    expect(closedReady.loggedApplicationId).toBe(2);
    expect(closedReady.tailor).toEqual({ status: 'idle' });
    expect(closedReady.sheetOpen).toBe(false);
    const filling = withPhase('filling', { sheetOpen: true, session: session(), tailor: { status: 'loading' } });
    expect(workspaceReducer(filling, { type: 'SHEET_CLOSED' }).phase).toBe('filling');
  });

  it('CONTEXT_CHANGED returns the initial state', () => {
    const ready = withPhase('ready', { session: session(), sheetOpen: true });
    expect(workspaceReducer(ready, { type: 'CONTEXT_CHANGED' })).toBe(initialWorkspaceState);
    expect(workspaceReducer(initialWorkspaceState, { type: 'CONTEXT_CHANGED' })).toBe(initialWorkspaceState);
  });

  it('returns the same reference for an action the phase does not list', () => {
    const cases: [WorkspaceState, Parameters<typeof workspaceReducer>[1]][] = [
      [withPhase('idle'), { type: 'SCRAPE_SUCCEEDED', message: scraped(200) }],
      [withPhase('scraping', { sheetOpen: true }), { type: 'PROFILE_MISSING' }],
      [withPhase('analyzing', { sheetOpen: true }), { type: 'FILL_REQUESTED' }],
      [withPhase('ready', { session: session() }), { type: 'SCRAPE_FAILED', code: 'TIMEOUT' }],
      [withPhase('filling', { session: session() }), { type: 'ANALYSIS_SUCCEEDED', session: session() }],
      [withPhase('error', { error: { kind: 'NO_CONTENT' } }), { type: 'FILL_COMPLETED', filledCount: 1, missingCount: 0 }],
    ];
    for (const [current, action] of cases) {
      expect(workspaceReducer(current, action)).toBe(current);
    }
  });
});
