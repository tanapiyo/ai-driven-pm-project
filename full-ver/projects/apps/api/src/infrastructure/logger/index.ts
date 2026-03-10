/**
 * @what 構造化ロガー（infrastructure 実装）
 * @why 構造化ログ出力でデバッグ・監視を容易に
 *
 * Logger インターフェースは domain/logger に定義されており、
 * この実装はそのポートを満たす concrete implementation.
 */

export type { LogLevel, LogContext, Logger } from '@/domain/logger/index.js';
import type { LogLevel, LogContext } from '@/domain/logger/index.js';
import type { Logger } from '@/domain/logger/index.js';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function extractErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    };
  }
  return { errorRaw: String(error) };
}

function createLogger(minLevel: LogLevel = 'info'): Logger {
  const minLevelValue = LOG_LEVELS[minLevel];

  function log(level: LogLevel, message: string, context?: LogContext): void {
    if (LOG_LEVELS[level] < minLevelValue) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
    };

    const output = JSON.stringify(entry);

    if (level === 'error') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }

  return {
    debug: (message, context) => log('debug', message, context),
    info: (message, context) => log('info', message, context),
    warn: (message, context) => log('warn', message, context),
    error: (message, context) => log('error', message, context),
    errorWithException: (message, error, context) =>
      log('error', message, { ...context, ...extractErrorDetails(error) }),
  };
}

const logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
export const logger = createLogger(logLevel);
