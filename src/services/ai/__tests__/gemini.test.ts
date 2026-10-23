import { logger } from '../../../lib/logger';
import { createGeminiProvider } from '../providers/gemini';
import { PING_SCHEMA } from '../schemas';
import type { AiRequest, ProviderDeps } from '../types';

const KEY = 'super-secret-key';
const SYSTEM = 'SECRET PROMPT';
const USER = 'USER PROMPT';

const request: AiRequest = {
  system: SYSTEM,
  user: USER,
  schema: PING_SCHEMA,
  schemaName: 'ping',
};

function jsonResponse(status: number, body: unknown, failJson = false): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => {
      if (failJson) return Promise.reject(new Error('not json'));
      return Promise.resolve(body);
    },
  } as Response;
}

function deps(fetchImpl: typeof fetch): ProviderDeps {
  return {
    config: {
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      baseUrl: 'https://generativelanguage.googleapis.com',
    },
    apiKey: KEY,
    fetchImpl,
  };
}

function abortingFetch(): typeof fetch {
  return (_input, init) =>
    new Promise((_resolve, reject) => {
      const fail = (): void => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      };
      if (init?.signal?.aborted) fail();
      else init?.signal?.addEventListener('abort', fail);
    });
}

describe('createGeminiProvider', () => {
  it('posts the documented URL, headers, and body, with the PDF part before text', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return Promise.resolve(
        jsonResponse(200, {
          candidates: [
            {
              content: {
                parts: [
                  { thought: true, text: 'not-json' },
                  { text: '{"ok":true}' },
                ],
              },
            },
          ],
        }),
      );
    };
    const result = await createGeminiProvider(deps(fetchImpl)).generateJson({
      ...request,
      pdfBase64: 'PDFDATA',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ ok: true });
    expect(capturedUrl).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
    );
    expect(capturedUrl).not.toContain(KEY);
    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['x-goog-api-key']).toBe(KEY);
    const body = JSON.parse(String(capturedInit?.body)) as {
      systemInstruction: { parts: { text: string }[] };
      contents: { role: string; parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] }[];
      generationConfig: { responseMimeType: string; temperature: number; responseSchema: { type: string } };
    };
    expect(body.systemInstruction.parts[0]?.text).toBe(SYSTEM);
    expect(body.contents[0]?.role).toBe('user');
    expect(body.contents[0]?.parts[0]?.inlineData).toEqual({ mimeType: 'application/pdf', data: 'PDFDATA' });
    expect(body.contents[0]?.parts[1]?.text).toBe(USER);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.temperature).toBe(0.2);
    expect(body.generationConfig.responseSchema.type).toBe('OBJECT');
  });

  it('maps its own timer to TIMEOUT', async () => {
    jest.useFakeTimers();
    try {
      const pending = createGeminiProvider(deps(abortingFetch())).generateJson({ ...request, timeoutMs: 30000 });
      await jest.advanceTimersByTimeAsync(30000);
      const result = await pending;
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('TIMEOUT');
    } finally {
      jest.useRealTimers();
    }
  });

  it('rethrows AbortError when the caller cancels', async () => {
    const caller = new AbortController();
    const pending = createGeminiProvider(deps(abortingFetch())).generateJson({ ...request, signal: caller.signal });
    caller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });

    let called = false;
    const again: typeof fetch = () => {
      called = true;
      return Promise.resolve(jsonResponse(200, {}));
    };
    await expect(
      createGeminiProvider(deps(again)).generateJson({ ...request, signal: caller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(called).toBe(false);
  });

  it('maps a thrown fetch to NETWORK', async () => {
    const fetchImpl: typeof fetch = () => Promise.reject(new Error('offline'));
    const result = await createGeminiProvider(deps(fetchImpl)).generateJson(request);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NETWORK');
  });

  it.each([
    [400, 'BAD_REQUEST'],
    [401, 'AUTH'],
    [403, 'AUTH'],
    [404, 'MODEL_NOT_FOUND'],
    [429, 'RATE_LIMITED'],
    [500, 'SERVER'],
  ] as const)('maps HTTP %s to %s without reading the body', async (status, code) => {
    const fetchImpl: typeof fetch = () => Promise.resolve(jsonResponse(status, { ignored: true }, true));
    const result = await createGeminiProvider(deps(fetchImpl)).generateJson(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(code);
      expect(result.error.httpStatus).toBe(status);
    }
  });

  it('maps HTTP 400 with API_KEY_INVALID to AUTH (D-004)', async () => {
    const badKeyBody = {
      error: {
        code: 400,
        message: 'API key not valid. Please pass a valid API key.',
        status: 'INVALID_ARGUMENT',
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
            reason: 'API_KEY_INVALID',
            domain: 'googleapis.com',
          },
        ],
      },
    };
    const fetchImpl: typeof fetch = () => Promise.resolve(jsonResponse(400, badKeyBody));
    const result = await createGeminiProvider(deps(fetchImpl)).generateJson(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('AUTH');
      expect(result.error.httpStatus).toBe(400);
    }
  });

  it('maps HTTP 400 without API_KEY_INVALID to BAD_REQUEST (D-004)', async () => {
    const otherBody = {
      error: {
        code: 400,
        message: 'Invalid model parameter',
        status: 'INVALID_ARGUMENT',
        details: [],
      },
    };
    const fetchImpl: typeof fetch = () => Promise.resolve(jsonResponse(400, otherBody));
    const result = await createGeminiProvider(deps(fetchImpl)).generateJson(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('BAD_REQUEST');
      expect(result.error.httpStatus).toBe(400);
    }
  });

  it('maps HTTP 400 with non-JSON body to BAD_REQUEST (D-004)', async () => {
    const fetchImpl: typeof fetch = () => Promise.resolve(jsonResponse(400, 'plain error', true));
    const result = await createGeminiProvider(deps(fetchImpl)).generateJson(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('BAD_REQUEST');
      expect(result.error.httpStatus).toBe(400);
    }
  });

  it('maps a non-JSON body, a block, an empty candidate, unsafe finish, empty text, and bad JSON', async () => {
    const cases: { body: unknown; failJson?: boolean; code: string }[] = [
      { body: null, failJson: true, code: 'INVALID_JSON' },
      { body: { promptFeedback: { blockReason: 'SAFETY' } }, code: 'BLOCKED' },
      { body: { candidates: [] }, code: 'EMPTY_RESPONSE' },
      {
        body: { candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: '{"ok":true}' }] } }] },
        code: 'BLOCKED',
      },
      { body: { candidates: [{ content: { parts: [{ thought: true, text: '{"ok":true}' }] } }] }, code: 'EMPTY_RESPONSE' },
      { body: { candidates: [{ content: { parts: [{ text: 'not-json' }] } }] }, code: 'INVALID_JSON' },
    ];
    for (const item of cases) {
      const fetchImpl: typeof fetch = () => Promise.resolve(jsonResponse(200, item.body, item.failJson));
      const result = await createGeminiProvider(deps(fetchImpl)).generateJson(request);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe(item.code);
    }
  });

  it('does not log the key or the prompts', async () => {
    const error = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const info = jest.spyOn(logger, 'info').mockImplementation(() => undefined);
    const debug = jest.spyOn(logger, 'debug').mockImplementation(() => undefined);
    const fetchImpl: typeof fetch = () =>
      Promise.resolve(jsonResponse(200, { candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }));
    await createGeminiProvider(deps(fetchImpl)).generateJson(request);
    const logged = [error, warn, info, debug].flatMap((spy) => spy.mock.calls).map((call) => JSON.stringify(call));
    expect(logged.join('\n')).not.toContain(KEY);
    expect(logged.join('\n')).not.toContain(SYSTEM);
    expect(logged.join('\n')).not.toContain(USER);
    error.mockRestore();
    warn.mockRestore();
    info.mockRestore();
    debug.mockRestore();
  });
});
