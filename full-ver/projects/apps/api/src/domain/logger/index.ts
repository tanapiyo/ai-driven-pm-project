/**
 * @what Logger ドメインインターフェース
 * @why infrastructure 層の具体実装から domain 層を分離する
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  errorWithException(message: string, error: unknown, context?: LogContext): void;
}
