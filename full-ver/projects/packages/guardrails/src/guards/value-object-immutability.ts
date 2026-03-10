/**
 * @what Value Object の不変性検査
 * @why Value Objectはイミュータブルであるべき。setterや直接のプロパティ変更は禁止
 * @failure Value Object に setter や mutable な操作があれば警告
 *
 * 検査対象:
 * - ValueObject を継承したクラス
 * - props へ直接代入している箇所
 */

import { glob } from 'glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GuardResult, Violation } from '../runner.js';

const VALUE_OBJECT_PATTERN = /class\s+(\w+)\s+extends\s+ValueObject/g;
const SETTER_PATTERN = /set\s+(\w+)\s*\(/g;
const PROPS_MUTATION_PATTERN = /this\.props\.\w+\s*=/g;

export async function checkValueObjectImmutability(rootDir: string): Promise<GuardResult> {
  const violations: Violation[] = [];

  const files = await glob('**/domain/**/*.ts', {
    cwd: rootDir,
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.ts'],
    absolute: true,
  });

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');

    // ValueObject を継承したクラスを検出
    let match;
    VALUE_OBJECT_PATTERN.lastIndex = 0;

    while ((match = VALUE_OBJECT_PATTERN.exec(content)) !== null) {
      const className = match[1];
      const classStart = match.index;

      // クラス定義の範囲を取得
      const nextClassMatch = content.slice(classStart + match[0].length).search(/\nclass\s/);
      const classEnd =
        nextClassMatch >= 0 ? classStart + match[0].length + nextClassMatch : content.length;
      const classBody = content.slice(classStart, classEnd);

      // setter を検出
      SETTER_PATTERN.lastIndex = 0;
      let setterMatch;
      while ((setterMatch = SETTER_PATTERN.exec(classBody)) !== null) {
        const position = classStart + setterMatch.index;
        let lineNumber = 1;
        for (let i = 0; i < position; i++) {
          if (content[i] === '\n') lineNumber++;
        }

        violations.push({
          file: path.relative(rootDir, file),
          line: lineNumber,
          rule: 'value-object-immutability',
          message: `Value Object '${className}' has a setter '${setterMatch[1]}'. Value Objects should be immutable.`,
        });
      }

      // props への直接代入を検出
      PROPS_MUTATION_PATTERN.lastIndex = 0;
      let mutationMatch;
      while ((mutationMatch = PROPS_MUTATION_PATTERN.exec(classBody)) !== null) {
        const position = classStart + mutationMatch.index;
        let lineNumber = 1;
        for (let i = 0; i < position; i++) {
          if (content[i] === '\n') lineNumber++;
        }

        violations.push({
          file: path.relative(rootDir, file),
          line: lineNumber,
          rule: 'value-object-immutability',
          message: `Value Object '${className}' mutates props directly. Value Objects should be immutable.`,
        });
      }
    }
  }

  return {
    status: violations.length > 0 ? 'warn' : 'ok',
    violations: violations.length > 0 ? violations : undefined,
    message:
      violations.length > 0
        ? `Found ${violations.length} mutability issue(s) in Value Objects. Value Objectは不変であるべきです。`
        : undefined,
  };
}
