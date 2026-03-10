/**
 * @what ドメインイベントに因果メタが付いているか検査
 * @why 因果メタがないとイベント系列の追跡・再現ができないため
 * @failure 必須プロパティ（causationId/correlationId/emittedAt）を欠くイベントを検出した場合に非0終了
 *
 * 検査対象:
 * - domain/ 配下の DomainEvent を継承したクラス
 * - causationId, correlationId, emittedAt が存在すること
 */

import { glob } from 'glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GuardResult, Violation } from '../runner.js';

const EVENT_CLASS_PATTERN = /class\s+(\w+Event)\s+extends\s+DomainEvent/g;
const REQUIRED_PROPERTIES = ['causationId', 'correlationId', 'emittedAt'];

export async function checkDomainEventCausation(rootDir: string): Promise<GuardResult> {
  const violations: Violation[] = [];

  // ドメインイベントを含むファイルを検索
  const files = await glob('**/domain/**/*.ts', {
    cwd: rootDir,
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.ts'],
    absolute: true,
  });

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');

    // DomainEvent を継承したクラスを検出
    let match;
    EVENT_CLASS_PATTERN.lastIndex = 0;

    while ((match = EVENT_CLASS_PATTERN.exec(content)) !== null) {
      const className = match[1];
      const classStart = match.index;

      // クラス定義の範囲を取得（簡易的に次の class または EOF まで）
      const nextClassMatch = content.slice(classStart + match[0].length).search(/\nclass\s/);
      const classEnd =
        nextClassMatch >= 0 ? classStart + match[0].length + nextClassMatch : content.length;
      const classBody = content.slice(classStart, classEnd);

      // 必須プロパティが存在するか確認
      const missingProps = REQUIRED_PROPERTIES.filter((prop) => {
        // コンストラクタ引数またはプロパティ定義に含まれているか
        const propPattern = new RegExp(
          `(public|private|protected)?\\s*(readonly)?\\s*${prop}\\s*[:\\)]`
        );
        return !propPattern.test(classBody);
      });

      if (missingProps.length > 0) {
        // 行番号を特定
        const position = classStart;
        let lineNumber = 1;
        for (let i = 0; i < position; i++) {
          if (content[i] === '\n') lineNumber++;
        }

        violations.push({
          file: path.relative(rootDir, file),
          line: lineNumber,
          rule: 'domain-event-causation',
          message: `Event '${className}' is missing causation metadata: ${missingProps.join(', ')}`,
        });
      }
    }
  }

  return {
    status: violations.length > 0 ? 'error' : 'ok',
    violations: violations.length > 0 ? violations : undefined,
    message:
      violations.length > 0
        ? `Found ${violations.length} domain event(s) missing causation metadata. すべてのドメインイベントには causationId, correlationId, emittedAt が必要です。`
        : undefined,
  };
}
