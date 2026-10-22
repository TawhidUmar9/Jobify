#!/usr/bin/env node
/**
 * Deterministic AI + job-page mock for E2E and manual testing. Node built-ins only. Complete, not a stub.
 *
 *   npm run mock:server            # 0.0.0.0:8787 (PORT env overrides)
 *
 * Point the app at it in onboarding / Settings → AI provider:
 *   Gemini:            API key any non-empty value, Advanced → Base URL http://10.0.2.2:8787
 *   OpenAI-compatible: Base URL http://10.0.2.2:8787/v1, model "mock" (or "no-json-schema" to force
 *                      the json_object fallback, or "local-model" to allow an empty key)
 * Android emulator → 10.0.2.2; physical device on the same Wi-Fi → your PC's LAN IP; iOS simulator → localhost.
 *
 * Routes
 *   GET  /health                                  → "ok"
 *   GET  /fixtures/<name>.html                    → e2e/fixtures/pages/<name>.html
 *   POST /v1beta/models/<model>:generateContent   → Gemini wire format
 *   POST /v1/chat/completions                     → OpenAI-compatible wire format
 *   GET  /__requests                              → last 50 AI requests {provider, path, kind, auth, urlHasKeyParam, body}
 *   POST /__reset                                 → clears /__requests
 *
 * Call kind is detected from the schema in the request: tailor (has "bulletRewrites"),
 * analysis (has "fieldMappings"), resume_parse (has "highlights" + "fullName"), else ping.
 * Analysis responses are chosen by the scraped page file name (ANALYSIS_SCENARIOS).
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES_DIR = join(ROOT, 'e2e', 'fixtures', 'pages');
const AI_DIR = join(ROOT, 'e2e', 'fixtures', 'ai');
const PORT = Number(process.env.PORT || 8787);

/** Scraped page file name → behaviour for analysis calls. Unknown pages → analysis-unclear.json. */
const ANALYSIS_SCENARIOS = {
  'job-remote-form.html': { kind: 'ok', file: 'analysis-remote-ok.json' },
  'job-local-only.html': { kind: 'ok', file: 'analysis-not-eligible.json' },
  'job-unclear.html': { kind: 'ok', file: 'analysis-unclear.json' },
  'job-error-429.html': { kind: 'status', status: 429 },
  'job-error-500.html': { kind: 'status', status: 500 },
  'job-error-404.html': { kind: 'status', status: 404 },
  'job-slow.html': { kind: 'slow', delayMs: 35000, file: 'analysis-remote-ok.json' },
  'job-malformed.html': { kind: 'malformed' },
  'job-blocked.html': { kind: 'blocked' },
};

const requests = [];

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
  });
}

async function fixture(file) {
  return JSON.parse(await readFile(join(AI_DIR, file), 'utf8'));
}

function detectKind(rawBody) {
  if (rawBody.includes('"bulletRewrites"')) return 'tailor';
  if (rawBody.includes('"fieldMappings"')) return 'analysis';
  if (rawBody.includes('"highlights"') && rawBody.includes('"fullName"')) return 'resume_parse';
  return 'ping';
}

function scrapedPageName(userText) {
  try {
    return basename(new URL(JSON.parse(userText).url).pathname);
  } catch {
    return '';
  }
}

/**
 * Returns { status, json } for an AI call, independent of wire format:
 * json is the structured answer object, or a special marker for blocked/malformed.
 */
async function decide(kind, userText) {
  if (kind === 'ping') return { status: 200, json: { ok: true } };
  if (kind === 'tailor') return { status: 200, json: await fixture('tailor.json') };
  if (kind === 'resume_parse') return { status: 200, json: await fixture('resume-parse.json') };
  const scenario = ANALYSIS_SCENARIOS[scrapedPageName(userText)] ?? { kind: 'ok', file: 'analysis-unclear.json' };
  switch (scenario.kind) {
    case 'status':
      return { status: scenario.status };
    case 'malformed':
      return { status: 200, text: 'this is not json' };
    case 'blocked':
      return { status: 200, blocked: true };
    case 'slow':
      await new Promise((r) => setTimeout(r, scenario.delayMs));
      return { status: 200, json: await fixture(scenario.file) };
    default:
      return { status: 200, json: await fixture(scenario.file) };
  }
}

async function handleGemini(req, res, path, raw) {
  const body = JSON.parse(raw);
  const auth = req.headers['x-goog-api-key'] ?? null;
  const kind = detectKind(raw);
  requests.push({ provider: 'gemini', path, kind, auth: auth ? 'present' : null, urlHasKeyParam: /[?&]key=/.test(req.url), body });
  if (!auth) return send(res, 401, { error: { code: 401, message: 'API key missing', status: 'UNAUTHENTICATED' } });
  const parts = body?.contents?.[0]?.parts ?? [];
  const userText = parts.filter((p) => typeof p.text === 'string').map((p) => p.text).join('');
  const d = await decide(kind, userText);
  if (d.status !== 200) return send(res, d.status, { error: { code: d.status, message: 'mock', status: 'MOCK' } });
  if (d.blocked) return send(res, 200, { promptFeedback: { blockReason: 'SAFETY' } });
  const text = d.text ?? JSON.stringify(d.json);
  return send(res, 200, {
    candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP', index: 0 }],
    modelVersion: 'mock',
  });
}

async function handleOpenAi(req, res, path, raw) {
  const body = JSON.parse(raw);
  const authHeader = req.headers.authorization ?? null;
  const kind = detectKind(raw);
  requests.push({ provider: 'openai_compatible', path, kind, auth: authHeader ? 'present' : null, urlHasKeyParam: false, body });
  if (!authHeader && body.model !== 'local-model') {
    return send(res, 401, { error: { message: 'Missing bearer token', type: 'invalid_request_error' } });
  }
  if (body.model === 'no-json-schema' && body.response_format?.type === 'json_schema') {
    return send(res, 400, { error: { message: 'response_format json_schema not supported', type: 'invalid_request_error' } });
  }
  const userText = body?.messages?.find((m) => m.role === 'user')?.content ?? '';
  const d = await decide(kind, userText);
  if (d.status !== 200) return send(res, d.status, { error: { message: 'mock', type: 'mock' } });
  if (d.blocked) {
    return send(res, 200, { choices: [{ index: 0, message: { role: 'assistant', content: '' }, finish_reason: 'content_filter' }] });
  }
  // Wrap one answer in a ```json fence to exercise fence stripping.
  const content = d.text ?? (kind === 'tailor' ? '```json\n' + JSON.stringify(d.json) + '\n```' : JSON.stringify(d.json));
  return send(res, 200, {
    id: 'mock',
    object: 'chat.completion',
    model: body.model,
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  try {
    if (req.method === 'GET' && path === '/health') return send(res, 200, 'ok', 'text/plain');
    if (req.method === 'GET' && path === '/__requests') return send(res, 200, requests);
    if (req.method === 'POST' && path === '/__reset') {
      requests.length = 0;
      return send(res, 204, '');
    }
    if (req.method === 'GET' && path.startsWith('/fixtures/')) {
      const name = basename(path);
      if (!name.endsWith('.html')) return send(res, 404, 'not found', 'text/plain');
      return send(res, 200, await readFile(join(PAGES_DIR, name), 'utf8'), 'text/html; charset=utf-8');
    }
    if (req.method === 'POST' && /^\/v1beta\/models\/[^/]+:generateContent$/.test(path)) {
      const raw = await readBody(req);
      try {
        JSON.parse(raw);
      } catch {
        return send(res, 400, { error: { code: 400, message: 'Invalid JSON' } });
      }
      return await handleGemini(req, res, path, raw);
    }
    if (req.method === 'POST' && path === '/v1/chat/completions') {
      const raw = await readBody(req);
      try {
        JSON.parse(raw);
      } catch {
        return send(res, 400, { error: { message: 'Invalid JSON' } });
      }
      return await handleOpenAi(req, res, path, raw);
    }
    return send(res, 404, 'not found', 'text/plain');
  } catch (e) {
    if (e && e.code === 'ENOENT') return send(res, 404, 'not found', 'text/plain');
    return send(res, 500, String(e), 'text/plain');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Jobify mock server on http://0.0.0.0:${PORT}`);
});
