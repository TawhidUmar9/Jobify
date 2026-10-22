import type { PageScrapedMessage } from '../../../bridge/messages';
import { err, ok } from '../../../lib/result';
import { DEFAULT_PREFERENCES, EMPTY_PROFILE } from '../../../types/domain';
import { analyzeJob, createProvider, parseResume, tailorApplication, testConnection } from '../aiClient';
import { JOB_ANALYSIS_SCHEMA, RESUME_PARSE_SCHEMA, TAILOR_SCHEMA } from '../schemas';
import { AI_DEFAULTS, AI_PARSE_TIMEOUT_MS, AI_TIMEOUT_MS, type AiProvider, type AiRequest } from '../types';

function pingResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }),
  } as Response;
}

const scraped: PageScrapedMessage = {
  type: 'PAGE_SCRAPED',
  url: 'https://example.com/jobs/1',
  title: 'Role',
  pageText: 'Remote.',
  inputs: [],
};

describe('aiClient', () => {
  it('returns null unless Gemini has a key and OpenAI has a model and base URL', async () => {
    expect(createProvider(AI_DEFAULTS.gemini, '   ')).toBeNull();
    expect(createProvider(AI_DEFAULTS.openai_compatible, 'k')).toBeNull();
    expect(
      createProvider({ provider: 'openai_compatible', model: 'mock', baseUrl: '   ' }, ''),
    ).toBeNull();

    let sentKey = '';
    const fetchImpl: typeof fetch = (_input, init) => {
      const headers = init?.headers as Record<string, string>;
      sentKey = headers['x-goog-api-key'] ?? '';
      return Promise.resolve(pingResponse());
    };
    const provider = createProvider(AI_DEFAULTS.gemini, '  k  ', fetchImpl);
    expect(provider?.kind).toBe('gemini');
    const connected = await testConnection(provider);
    expect(connected).toEqual({ ok: true, value: true });
    expect(sentKey).toBe('k');

    const local = createProvider({ provider: 'openai_compatible', model: 'mock', baseUrl: 'http://localhost:8787/v1' }, '');
    expect(local?.kind).toBe('openai_compatible');
  });

  it('maps a ping that is not ok:true to SCHEMA_MISMATCH and a null provider to NOT_CONFIGURED', async () => {
    expect(await testConnection(null)).toEqual({ ok: false, error: { code: 'NOT_CONFIGURED' } });
    const provider: AiProvider = {
      kind: 'gemini',
      generateJson: async (req) => {
        expect(req.schemaName).toBe('ping');
        expect(req.timeoutMs).toBe(15000);
        return ok({ ok: false });
      },
    };
    expect(await testConnection(provider)).toEqual({ ok: false, error: { code: 'SCHEMA_MISMATCH' } });
  });

  it('passes schema names and timeouts, and does not call the provider for an unsupported PDF', async () => {
    let seen: AiRequest | undefined;
    const provider: AiProvider = {
      kind: 'gemini',
      generateJson: async (req) => {
        seen = req;
        return ok({});
      },
    };
    const analyzed = await analyzeJob(provider, {
      profile: EMPTY_PROFILE,
      preferences: DEFAULT_PREFERENCES,
      resumes: [],
      answers: [],
      scraped,
      today: new Date(Date.UTC(2026, 9, 22)),
    });
    expect(analyzed.ok).toBe(false);
    if (!analyzed.ok) expect(analyzed.error.code).toBe('SCHEMA_MISMATCH');
    expect(seen?.schemaName).toBe('job_analysis');
    expect(seen?.schema).toBe(JOB_ANALYSIS_SCHEMA);
    expect(seen?.timeoutMs).toBe(AI_TIMEOUT_MS);

    const tailored = await tailorApplication(provider, {
      profile: EMPTY_PROFILE,
      resume: null,
      analysis: {
        companyName: 'Acme Cloud',
        roleTitle: 'Role',
        eligibility: 'UNCLEAR',
        eligibilityReason: '',
        redFlags: [],
        matchScore: 1,
        recommendedResumeId: null,
        resumeReason: '',
        matchedSkills: [],
        missingSkills: [],
        fieldMappings: [],
      },
      pageText: 'page',
    });
    expect(tailored.ok).toBe(false);
    expect(seen?.schemaName).toBe('tailor');
    expect(seen?.schema).toBe(TAILOR_SCHEMA);
    expect(seen?.timeoutMs).toBe(AI_TIMEOUT_MS);

    const parsed = await parseResume(provider, { pdfBase64: null, pastedText: 'Alex Rahman' });
    expect(parsed.ok).toBe(false);
    expect(seen?.schemaName).toBe('resume_parse');
    expect(seen?.schema).toBe(RESUME_PARSE_SCHEMA);
    expect(seen?.timeoutMs).toBe(AI_PARSE_TIMEOUT_MS);

    let called = false;
    const openai: AiProvider = {
      kind: 'openai_compatible',
      generateJson: async () => {
        called = true;
        return err({ code: 'NETWORK' });
      },
    };
    const pdf = await parseResume(openai, { pdfBase64: 'PDF', pastedText: null });
    expect(called).toBe(false);
    expect(pdf).toEqual({ ok: false, error: { code: 'PDF_NOT_SUPPORTED' } });
  });

  it('passes provider errors through', async () => {
    const provider: AiProvider = {
      kind: 'gemini',
      generateJson: async () => err({ code: 'RATE_LIMITED', httpStatus: 429 }),
    };
    const result = await analyzeJob(provider, {
      profile: EMPTY_PROFILE,
      preferences: DEFAULT_PREFERENCES,
      resumes: [],
      answers: [],
      scraped,
      today: new Date(),
    });
    expect(result).toEqual({ ok: false, error: { code: 'RATE_LIMITED', httpStatus: 429 } });
  });
});
