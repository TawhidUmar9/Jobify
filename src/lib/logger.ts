/**
 * The only logging entry point. Do not call console.* elsewhere.
 * Rules (enforced by review, see AGENT_INSTRUCTIONS.md):
 * - Never log: API keys, pageText, cold DM text, field values, candidate profile.
 * - Allowed: error codes, HTTP status, counts, URLs' hostname only.
 * - debug/info are dropped when __DEV__ is false; warn/error always go to console.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, scope: string, message: string, meta?: Record<string, unknown>): void {
  if (!__DEV__ && (level === 'debug' || level === 'info')) return;
  const line = `[${scope}] ${message}`;
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](line, meta ?? '');
}

export const logger = {
  debug: (scope: string, message: string, meta?: Record<string, unknown>) => emit('debug', scope, message, meta),
  info: (scope: string, message: string, meta?: Record<string, unknown>) => emit('info', scope, message, meta),
  warn: (scope: string, message: string, meta?: Record<string, unknown>) => emit('warn', scope, message, meta),
  error: (scope: string, message: string, meta?: Record<string, unknown>) => emit('error', scope, message, meta),
};
