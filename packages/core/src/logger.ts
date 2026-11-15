export type LogContext = Record<string, unknown>;

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

const REDACTED = '[redacted]';
const SENSITIVE_KEY = /pass(word)?|secret|token|jwt|authorization|cookie|question|body|url|link/i;

/** Copies the context with sensitive values masked before it is logged. */
export function redact(value: unknown): unknown {
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, SENSITIVE_KEY.test(key) ? REDACTED : redact(entry)]),
    );
  }
  return value;
}

type Sink = (line: string) => void;

/** Structured JSON logger. The sink is injectable for tests. */
export function createLogger(sink: Sink = (line) => process.stderr.write(`${line}\n`)): Logger {
  const write = (level: string, message: string, context?: LogContext) =>
    sink(JSON.stringify({ level, message, time: new Date().toISOString(), ...(redact(context) as LogContext) }));

  return {
    info: (message, context) => write('info', message, context),
    warn: (message, context) => write('warn', message, context),
    error: (message, context) => write('error', message, context),
  };
}
