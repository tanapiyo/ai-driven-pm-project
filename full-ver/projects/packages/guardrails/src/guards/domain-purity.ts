/**
 * @what Domain 層が外部依存を持っていないか検査
 * @why Clean Architecture の核心 - Domain は純粋なビジネスロジックであるべき
 * @failure Domain が infrastructure/usecase/presentation/外部ライブラリを import していたらエラー
 *
 * 許可される import:
 * - 同じ domain 層内
 * - Node.js 組み込みモジュール（path, fs は禁止）
 * - 型定義のみの import（type-only import）
 *
 * 禁止される import:
 * - infrastructure, usecase, presentation レイヤー
 * - フレームワーク（express, fastify, next, react 等）
 * - ORM/DB（prisma, typeorm, knex 等）
 * - HTTP クライアント（axios, fetch wrapper 等）
 */

import { glob } from 'glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GuardResult, Violation } from '../runner.js';

// 禁止レイヤーへの import パターン
const FORBIDDEN_LAYER_PATTERNS = [
  { pattern: /from\s+['"][^'"]*\/infrastructure[^'"]*['"]/g, layer: 'infrastructure' },
  { pattern: /from\s+['"][^'"]*\/usecase[^'"]*['"]/g, layer: 'usecase' },
  { pattern: /from\s+['"][^'"]*\/presentation[^'"]*['"]/g, layer: 'presentation' },
];

// 禁止フレームワーク/ライブラリ（type-only import を除く）
const FORBIDDEN_PACKAGES = [
  // ORM/DB
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]@?prisma[^'"]*['"]/gm, pkg: 'prisma' },
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]typeorm[^'"]*['"]/gm, pkg: 'typeorm' },
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]knex[^'"]*['"]/gm, pkg: 'knex' },
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]pg['"]/gm, pkg: 'pg' },
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]mysql[^'"]*['"]/gm, pkg: 'mysql' },
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]mongodb[^'"]*['"]/gm, pkg: 'mongodb' },

  // Web フレームワーク
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]express[^'"]*['"]/gm, pkg: 'express' },
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]fastify[^'"]*['"]/gm, pkg: 'fastify' },
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]hono[^'"]*['"]/gm, pkg: 'hono' },
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]koa[^'"]*['"]/gm, pkg: 'koa' },

  // React/Next.js
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]react[^'"]*['"]/gm, pkg: 'react' },
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]next[^'"]*['"]/gm, pkg: 'next' },

  // HTTP クライアント
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]axios[^'"]*['"]/gm, pkg: 'axios' },
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]node-fetch[^'"]*['"]/gm, pkg: 'node-fetch' },
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]got[^'"]*['"]/gm, pkg: 'got' },

  // File system (should use infrastructure)
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]fs['"]/gm, pkg: 'fs' },
  { pattern: /^import\s+(?!type\s)[^'"]*from\s+['"]node:fs['"]/gm, pkg: 'node:fs' },
];

function getLineNumber(content: string, position: number): number {
  let lineNumber = 1;
  for (let i = 0; i < position; i++) {
    if (content[i] === '\n') lineNumber++;
  }
  return lineNumber;
}

export async function checkDomainPurity(rootDir: string): Promise<GuardResult> {
  const violations: Violation[] = [];

  const files = await glob('**/domain/**/*.ts', {
    cwd: rootDir,
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts', '**/generated/**'],
    absolute: true,
  });

  if (files.length === 0) {
    return {
      status: 'ok',
      message: 'No domain files found, skipping purity check',
    };
  }

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relPath = path.relative(rootDir, file);

    // レイヤー依存チェック
    for (const { pattern, layer } of FORBIDDEN_LAYER_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        violations.push({
          file: relPath,
          line: getLineNumber(content, match.index),
          rule: 'domain-purity',
          message: `Domain layer cannot import from '${layer}'. Domain must be pure business logic with no external dependencies.`,
        });
      }
    }

    // パッケージ依存チェック
    for (const { pattern, pkg } of FORBIDDEN_PACKAGES) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        violations.push({
          file: relPath,
          line: getLineNumber(content, match.index),
          rule: 'domain-purity',
          message: `Domain layer cannot import '${pkg}'. Use infrastructure layer for external dependencies. Tip: Use 'import type' if you only need types.`,
        });
      }
    }
  }

  return {
    status: violations.length > 0 ? 'error' : 'ok',
    violations: violations.length > 0 ? violations : undefined,
    message:
      violations.length > 0
        ? `Found ${violations.length} domain purity violation(s). Domain層は純粋なビジネスロジックを保ち、外部依存を持たないでください。`
        : undefined,
  };
}
