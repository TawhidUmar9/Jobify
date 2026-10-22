import type { PageScrapedMessage, ScrapedInput } from '../../../bridge/messages';
import { logger } from '../../../lib/logger';
import { DEFAULT_PREFERENCES, EMPTY_PROFILE, type Resume } from '../../../types/domain';
import { analyzeJob, createProvider, parseResume, tailorApplication, testConnection } from '../aiClient';

function input(index: number): ScrapedInput {
  return {
    clawId: `jobify-field-${index}`,
    tag: 'input',
    type: 'text',
    name: '',
    id: '',
    placeholder: '',
    ariaLabel: '',
    label: `Label ${index}`,
  };
}

const scraped: PageScrapedMessage = {
  type: 'PAGE_SCRAPED',
  url: 'http://localhost:8787/fixtures/job-remote-form.html',
  title: 'Senior Backend Engineer',
  pageText: 'Fully remote backend role.',
  inputs: [0, 1, 2, 3, 4].map(input),
};

const resume: Resume = {
  id: 1,
  label: 'Backend',
  fileName: null,
  fileUri: null,
  content: { summary: 'Backend engineer.', skills: ['Node.js'], highlights: ['Built CI pipelines for 6 services'] },
  createdAt: '2026-10-01 00:00:00',
};

interface IncomingMessage {
  statusCode?: number;
  on(event: 'data', listener: (chunk: unknown) => void): void;
  on(event: 'end', listener: () => void): void;
}

interface ClientRequest {
  on(event: 'error', listener: (error: unknown) => void): void;
  write(body: string): void;
  end(): void;
}

interface HttpModule {
  request(
    options: { hostname: string; port: string; path: string; method: string; headers?: Record<string, string> },
    callback: (response: IncomingMessage) => void,
  ): ClientRequest;
}

declare const require: (id: string) => HttpModule;

/** Jest's React Native fetch stub does not perform network I/O, so the live check uses Node's HTTP client. */
async function nodeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input));
  const http = require(url.protocol === 'https:' ? 'node:https' : 'node:http');
  const headers = init?.headers && !Array.isArray(init.headers) ? (init.headers as Record<string, string>) : {};
  const decoder = new TextDecoder();
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: init?.method ?? 'GET',
        headers,
      },
      (response) => {
        let body = '';
        response.on('data', (chunk: unknown) => {
          if (typeof chunk === 'string') body += chunk;
          else if (chunk instanceof Uint8Array) body += decoder.decode(chunk, { stream: true });
        });
        response.on('end', () => {
          body += decoder.decode();
          const status = response.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            text: () => Promise.resolve(body),
            json: () => Promise.resolve(JSON.parse(body) as unknown),
          } as Response);
        });
      },
    );
    request.on('error', reject);
    if (typeof init?.body === 'string') request.write(init.body);
    request.end();
  });
}

async function mockServerUp(): Promise<boolean> {
  try {
    const response = await nodeFetch('http://localhost:8787/health');
    const text = await response.text();
    return response.ok && text.includes('ok');
  } catch {
    return false;
  }
}

describe('aiClient integration', () => {
  it('talks to the mock server for Gemini and OpenAI-compatible', async () => {
    if (!(await mockServerUp())) {
      logger.info('aiClient.integration', 'mock server unreachable at http://localhost:8787/health; live checks not run');
      return;
    }
    const gemini = createProvider(
      { provider: 'gemini', model: 'mock', baseUrl: 'http://localhost:8787' },
      'test-key',
      nodeFetch,
    );
    const openai = createProvider(
      { provider: 'openai_compatible', model: 'mock', baseUrl: 'http://localhost:8787/v1' },
      'k',
      nodeFetch,
    );
    expect(gemini).not.toBeNull();
    expect(openai).not.toBeNull();
    if (!gemini || !openai) return;

    expect(await testConnection(gemini)).toEqual({ ok: true, value: true });
    expect(await testConnection(openai)).toEqual({ ok: true, value: true });

    for (const provider of [gemini, openai]) {
      const analysis = await analyzeJob(provider, {
        profile: { ...EMPTY_PROFILE, fullName: 'Alex Rahman', countryCode: 'BD', timeZone: 'Asia/Dhaka' },
        preferences: DEFAULT_PREFERENCES,
        resumes: [resume],
        answers: [],
        scraped,
        today: new Date(Date.UTC(2026, 9, 22)),
      });
      expect(analysis.ok).toBe(true);
      if (!analysis.ok) return;
      expect(analysis.value.companyName).toBe('Acme Cloud');
      expect(analysis.value.matchScore).toBe(92);
      expect(analysis.value.fieldMappings).toHaveLength(5);
      expect(analysis.value.fieldMappings[4]?.source).toBe('GENERATED');

      const tailored = await tailorApplication(provider, {
        profile: EMPTY_PROFILE,
        resume,
        analysis: analysis.value,
        pageText: scraped.pageText,
      });
      expect(tailored.ok).toBe(true);
      if (!tailored.ok) return;
      expect(tailored.value.emphasize).toHaveLength(3);
      expect(tailored.value.bulletRewrites).toHaveLength(1);
    }

    const parsed = await parseResume(gemini, {
      pdfBase64: null,
      pastedText: 'Alex Rahman, backend engineer in Dhaka.',
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.profile.fullName).toBe('Alex Rahman');
  });
});
