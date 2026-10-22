import { createOpenAiCompatibleProvider } from '../providers/openaiCompatible';
import { PING_SCHEMA } from '../schemas';
import type { AiRequest, ProviderDeps } from '../types';

const request: AiRequest = {
  system: 'Reply with JSON.',
  user: 'ping',
  schema: PING_SCHEMA,
  schemaName: 'ping',
};

function jsonResponse(status: number, body: unknown, failJson = false): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => (failJson ? Promise.reject(new Error('not json')) : Promise.resolve(body)),
  } as Response;
}

function okChoice(content: string, finishReason = 'stop'): unknown {
  return { choices: [{ finish_reason: finishReason, message: { content } }] };
}

function deps(fetchImpl: typeof fetch, extra: Partial<ProviderDeps> = {}): ProviderDeps {
  return {
    config: {
      provider: 'openai_compatible',
      model: 'mock',
      baseUrl: 'http://localhost:8787/v1',
    },
    apiKey: 'k',
    fetchImpl,
    ...extra,
  };
}

describe('createOpenAiCompatibleProvider', () => {
  it('posts the chat completions body and omits Authorization when the key is empty', async () => {
    const bodies: unknown[] = [];
    const headers: Record<string, string>[] = [];
    const fetchImpl: typeof fetch = (input, init) => {
      expect(String(input)).toBe('http://localhost:8787/v1/chat/completions');
      headers.push({ ...(init?.headers as Record<string, string>) });
      bodies.push(JSON.parse(String(init?.body)));
      return Promise.resolve(jsonResponse(200, okChoice('{"ok":true}')));
    };
    const result = await createOpenAiCompatibleProvider(deps(fetchImpl, { apiKey: '' })).generateJson(request);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ ok: true });
    expect(headers[0]).toEqual({ 'Content-Type': 'application/json' });
    expect(bodies[0]).toEqual({
      model: 'mock',
      temperature: 0.2,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'ping', schema: PING_SCHEMA, strict: false },
      },
    });
  });

  it('retries a 400 once with json_object and maps a second 400 to BAD_REQUEST', async () => {
    const formats: string[] = [];
    let calls = 0;
    const fetchImpl: typeof fetch = (_input, init) => {
      calls += 1;
      const body = JSON.parse(String(init?.body)) as {
        response_format: { type: string };
        messages: { content: string }[];
      };
      formats.push(body.response_format.type);
      if (calls === 1) return Promise.resolve(jsonResponse(400, { error: 'no schema' }, true));
      expect(body.messages[0]?.content).toContain('Respond only with JSON matching this schema:');
      expect(body.messages[0]?.content).toContain(JSON.stringify(PING_SCHEMA));
      return Promise.resolve(jsonResponse(200, okChoice('```json\n{"ok":true}\n```')));
    };
    const result = await createOpenAiCompatibleProvider(deps(fetchImpl)).generateJson(request);
    expect(formats).toEqual(['json_schema', 'json_object']);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ ok: true });

    let secondCalls = 0;
    const bothBad: typeof fetch = () => {
      secondCalls += 1;
      return Promise.resolve(jsonResponse(400, {}, true));
    };
    const failed = await createOpenAiCompatibleProvider(deps(bothBad)).generateJson(request);
    expect(secondCalls).toBe(2);
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.code).toBe('BAD_REQUEST');
  });

  it('does not fetch for a PDF or an empty model', async () => {
    const fetchImpl: typeof fetch = () => {
      throw new Error('should not fetch');
    };
    const pdf = await createOpenAiCompatibleProvider(deps(fetchImpl)).generateJson({ ...request, pdfBase64: 'PDF' });
    expect(pdf.ok).toBe(false);
    if (!pdf.ok) expect(pdf.error.code).toBe('PDF_NOT_SUPPORTED');
    const missing = await createOpenAiCompatibleProvider(
      deps(fetchImpl, { config: { provider: 'openai_compatible', model: '', baseUrl: 'http://localhost:8787/v1' } }),
    ).generateJson(request);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe('NOT_CONFIGURED');
  });

  it('maps content_filter to BLOCKED and shared HTTP failures', async () => {
    const blocked = await createOpenAiCompatibleProvider(
      deps(() => Promise.resolve(jsonResponse(200, okChoice('', 'content_filter')))),
    ).generateJson(request);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.code).toBe('BLOCKED');

    const rows = [
      [401, 'AUTH'],
      [403, 'AUTH'],
      [404, 'MODEL_NOT_FOUND'],
      [429, 'RATE_LIMITED'],
      [500, 'SERVER'],
    ] as const;
    for (const [status, code] of rows) {
      const result = await createOpenAiCompatibleProvider(
        deps(() => Promise.resolve(jsonResponse(status, {}, true))),
      ).generateJson(request);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe(code);
    }
    const offline = await createOpenAiCompatibleProvider(deps(() => Promise.reject(new Error('offline')))).generateJson(
      request,
    );
    expect(offline.ok).toBe(false);
    if (!offline.ok) expect(offline.error.code).toBe('NETWORK');
    const badJson = await createOpenAiCompatibleProvider(
      deps(() => Promise.resolve(jsonResponse(200, {}, true))),
    ).generateJson(request);
    expect(badJson.ok).toBe(false);
    if (!badJson.ok) expect(badJson.error.code).toBe('INVALID_JSON');
    const empty = await createOpenAiCompatibleProvider(
      deps(() => Promise.resolve(jsonResponse(200, { choices: [] }))),
    ).generateJson(request);
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error.code).toBe('EMPTY_RESPONSE');
    const notJson = await createOpenAiCompatibleProvider(
      deps(() => Promise.resolve(jsonResponse(200, okChoice('nope')))),
    ).generateJson(request);
    expect(notJson.ok).toBe(false);
    if (!notJson.ok) expect(notJson.error.code).toBe('INVALID_JSON');
  });

  it('maps its own timer to TIMEOUT and rethrows a caller abort', async () => {
    jest.useFakeTimers();
    try {
      const hanging: typeof fetch = (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        });
      const pending = createOpenAiCompatibleProvider(deps(hanging)).generateJson({ ...request, timeoutMs: 30000 });
      await jest.advanceTimersByTimeAsync(30000);
      const result = await pending;
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('TIMEOUT');
    } finally {
      jest.useRealTimers();
    }
    const caller = new AbortController();
    const pending = createOpenAiCompatibleProvider(
      deps((_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
      ),
    ).generateJson({ ...request, signal: caller.signal });
    caller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
