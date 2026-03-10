/**
 * @what バリデーションミドルウェア
 * @why リクエストボディのZodスキーマバリデーションを統一的に処理
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { z } from 'zod';

export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
}

export type ValidateResult<T> = ValidationResult<T> | ValidationError;

export class ValidationMiddleware {
  /**
   * リクエストボディをパースしてZodスキーマでバリデーション
   */
  async validate<T>(
    req: IncomingMessage,
    res: ServerResponse,
    schema: z.ZodSchema<T>
  ): Promise<ValidateResult<T>> {
    try {
      const body = await this.parseJsonBody(req);
      const result = schema.safeParse(body);

      if (!result.success) {
        this.sendValidationError(res, result.error);
        return { success: false };
      }

      return { success: true, data: result.data };
    } catch {
      this.sendParseError(res);
      return { success: false };
    }
  }

  private async parseJsonBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }

  private sendValidationError(res: ServerResponse, error: z.ZodError): void {
    const errors = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors,
      })
    );
  }

  private sendParseError(res: ServerResponse): void {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        code: 'PARSE_ERROR',
        message: 'Invalid JSON body',
      })
    );
  }
}
