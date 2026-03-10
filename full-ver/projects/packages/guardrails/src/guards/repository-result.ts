/**
 * @what リポジトリがResult<T>を返しているか検査
 * @why 生のPromiseだとエラー分類ができず、呼び出し側の扱いが不整合になるため
 * @failure Result を使っていないリポジトリメソッドを検出した場合に非0終了
 *
 * 検査対象:
 * - domain/配下の repository ファイルのインターフェース
 * - 戻り値が Promise Result でない場合は違反
 */

import { glob } from 'glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GuardResult, Violation } from '../runner.js';

const RESULT_PATTERN = /Promise<Result</;
const METHOD_PATTERN = /^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*:\s*([^;{]+)/gm;
const REPOSITORY_INTERFACE_PATTERN = /interface\s+\w*Repository\w*/;

export async function checkRepositoryResult(rootDir: string): Promise<GuardResult> {
  const violations: Violation[] = [];

  // リポジトリインターフェースを含むファイルを検索
  const files = await glob('**/domain/**/*repository*.ts', {
    cwd: rootDir,
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.ts'],
    absolute: true,
  });

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');

    // リポジトリインターフェースを含むファイルのみ検査
    if (!REPOSITORY_INTERFACE_PATTERN.test(content)) {
      continue;
    }

    // メソッド定義を検出
    let match;
    METHOD_PATTERN.lastIndex = 0;

    while ((match = METHOD_PATTERN.exec(content)) !== null) {
      const methodName = match[1];
      const returnType = match[2].trim();

      // Promise を返すメソッドのみ検査
      if (!returnType.includes('Promise<')) {
        continue;
      }

      // Result を使っていない場合は違反
      if (!RESULT_PATTERN.test(returnType)) {
        // 行番号を特定
        const position = match.index;
        let lineNumber = 1;
        for (let i = 0; i < position; i++) {
          if (content[i] === '\n') lineNumber++;
        }

        violations.push({
          file: path.relative(rootDir, file),
          line: lineNumber,
          rule: 'repository-result',
          message: `Method '${methodName}' should return Promise<Result<T, E>> instead of '${returnType}'`,
        });
      }
    }
  }

  return {
    status: violations.length > 0 ? 'error' : 'ok',
    violations: violations.length > 0 ? violations : undefined,
    message:
      violations.length > 0
        ? `Found ${violations.length} repository method(s) not using Result<T>. リポジトリはResult<T>で戻り値をラップしてください。`
        : undefined,
  };
}
