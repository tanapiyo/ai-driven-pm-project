/**
 * @what OpenAPI仕様のルートが実装されているか照合
 * @why 仕様と実装がズレるとクライアントが404になるため
 * @failure 未実装ルートがある場合、一覧を出力して非0終了
 *
 * 検査対象:
 * - docs/02_architecture/api/*.yaml の paths
 * - presentation/router.ts のルート定義
 */

import { glob } from 'glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import type { GuardResult, Violation } from '../runner.js';

interface OpenAPIDocument {
  paths?: Record<string, Record<string, unknown>>;
}

export async function checkOpenapiRouteCoverage(rootDir: string): Promise<GuardResult> {
  const violations: Violation[] = [];

  // OpenAPI仕様ファイルを検索
  const specFiles = await glob('docs/02_architecture/api/*.yaml', {
    cwd: rootDir,
    absolute: true,
  });

  if (specFiles.length === 0) {
    // OpenAPI仕様がなければスキップ
    return {
      status: 'ok',
      message: 'No OpenAPI spec files found, skipping route coverage check',
    };
  }

  // OpenAPIからルート一覧を抽出
  const specRoutes = new Map<string, { method: string; path: string; file: string }>();

  for (const specFile of specFiles) {
    const content = fs.readFileSync(specFile, 'utf-8');
    const document: OpenAPIDocument = yaml.parse(content);

    if (!document.paths) continue;

    for (const [urlPath, methods] of Object.entries(document.paths)) {
      for (const method of Object.keys(methods)) {
        if (method === 'parameters' || method === '$ref') continue;
        const key = `${method.toUpperCase()} ${urlPath}`;
        specRoutes.set(key, {
          method: method.toUpperCase(),
          path: urlPath,
          file: path.relative(rootDir, specFile),
        });
      }
    }
  }

  // ルーターファイルからルート一覧を抽出
  const routerFiles = await glob('**/presentation/**/router*.ts', {
    cwd: rootDir,
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.ts'],
    absolute: true,
  });

  const implRoutes = new Set<string>();

  // ルート定義パターン
  // 例: if (pathname === '/users' && method === 'POST')
  // 例: /^\/users\/([^/]+)$/ - GET /users/:id
  const ROUTE_PATTERN = /pathname\s*===\s*['"]([^'"]+)['"]\s*&&\s*method\s*===\s*['"](\w+)['"]/g;
  const PARAM_ROUTE_PATTERN =
    /pathname\.match\(\/\^([^$]+)\$\/\)\s*&&\s*method\s*===\s*['"](\w+)['"]/g;

  for (const routerFile of routerFiles) {
    const content = fs.readFileSync(routerFile, 'utf-8');

    // 静的ルート
    let match;
    ROUTE_PATTERN.lastIndex = 0;
    while ((match = ROUTE_PATTERN.exec(content)) !== null) {
      const urlPath = match[1];
      const method = match[2].toUpperCase();
      implRoutes.add(`${method} ${urlPath}`);
    }

    // パラメータ付きルート（簡易的なパターン変換）
    PARAM_ROUTE_PATTERN.lastIndex = 0;
    while ((match = PARAM_ROUTE_PATTERN.exec(content)) !== null) {
      // 正規表現をOpenAPIパスに変換（簡易）
      // \/users\/([^/]+) → /users/{id}
      const urlPath = match[1]
        .replace(/\\\//g, '/')
        .replace(/\(\[\^\/\]\+\)/g, '{id}')
        .replace(/\(\[\^\/\]\*\)/g, '{id}');
      const method = match[2].toUpperCase();
      implRoutes.add(`${method} ${urlPath}`);
    }
  }

  // 未実装ルートを検出
  for (const [key, route] of specRoutes) {
    // パラメータ付きルートの正規化
    const normalizedKey = key.replace(/\{[^}]+\}/g, '{id}');

    // 実装されているかチェック
    let found = false;
    for (const implRoute of implRoutes) {
      const normalizedImpl = implRoute.replace(/\{[^}]+\}/g, '{id}');
      if (normalizedKey === normalizedImpl) {
        found = true;
        break;
      }
    }

    if (!found) {
      violations.push({
        file: route.file,
        rule: 'openapi-route-coverage',
        message: `Route '${route.method} ${route.path}' defined in OpenAPI but not implemented`,
      });
    }
  }

  return {
    status: violations.length > 0 ? 'error' : 'ok',
    violations: violations.length > 0 ? violations : undefined,
    message:
      violations.length > 0
        ? `Found ${violations.length} OpenAPI route(s) without implementation. OpenAPI仕様に定義されたルートを実装してください。`
        : undefined,
  };
}
