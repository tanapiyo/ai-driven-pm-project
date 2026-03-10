/**
 * @what UseCase が infrastructure を直接 import していないか検査
 * @why Clean Architecture の依存方向を維持するため
 * @failure UseCase が infrastructure をimportしていたらエラー
 *
 * 補足: ESLint boundaries プラグインでもチェックするが、
 *       より詳細なエラーメッセージを出すためにカスタムガードでも検査
 */

import { glob } from 'glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GuardResult, Violation } from '../runner.js';

const IMPORT_INFRA_PATTERN = /from\s+['"][^'"]*\/infrastructure[^'"]*['"]/g;
const IMPORT_PRESENTATION_PATTERN = /from\s+['"][^'"]*\/presentation[^'"]*['"]/g;

export async function checkUsecaseDependency(rootDir: string): Promise<GuardResult> {
  const violations: Violation[] = [];

  const files = await glob('**/usecase/**/*.ts', {
    cwd: rootDir,
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.ts'],
    absolute: true,
  });

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');

    // infrastructure への import を検出
    let match;
    IMPORT_INFRA_PATTERN.lastIndex = 0;
    while ((match = IMPORT_INFRA_PATTERN.exec(content)) !== null) {
      const position = match.index;
      let lineNumber = 1;
      for (let i = 0; i < position; i++) {
        if (content[i] === '\n') lineNumber++;
      }

      violations.push({
        file: path.relative(rootDir, file),
        line: lineNumber,
        rule: 'usecase-dependency',
        message:
          'UseCase should not import from infrastructure directly. Use dependency injection.',
      });
    }

    // presentation への import を検出
    IMPORT_PRESENTATION_PATTERN.lastIndex = 0;
    while ((match = IMPORT_PRESENTATION_PATTERN.exec(content)) !== null) {
      const position = match.index;
      let lineNumber = 1;
      for (let i = 0; i < position; i++) {
        if (content[i] === '\n') lineNumber++;
      }

      violations.push({
        file: path.relative(rootDir, file),
        line: lineNumber,
        rule: 'usecase-dependency',
        message: 'UseCase should not import from presentation layer.',
      });
    }
  }

  return {
    status: violations.length > 0 ? 'error' : 'ok',
    violations: violations.length > 0 ? violations : undefined,
    message:
      violations.length > 0
        ? `Found ${violations.length} dependency violation(s) in usecase layer. UseCaseはinfrastructure/presentationをimportしないでください。`
        : undefined,
  };
}
