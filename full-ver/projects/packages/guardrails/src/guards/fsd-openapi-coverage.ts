/**
 * @what OpenAPI 生成物と shared/api の整合性を検査
 * @why OpenAPI 仕様が更新されても生成物が古いままだとクライアントが不整合になるため
 * @failure 仕様と生成物の不整合を検出した場合に非0終了
 *
 * 検査対象:
 * - docs/02_architecture/api/*.yaml の paths
 * - src/shared/api/generated/ の生成物
 *
 * 注意: このガードレールは生成物の存在確認のみ。
 *       実際の整合性は openapi-generator の実行時にチェックされる。
 */

import { glob } from 'glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import type { GuardResult, Violation } from '../runner.js';

interface OpenAPIDocument {
  info?: { title?: string };
  paths?: Record<string, Record<string, unknown>>;
}

export async function checkFsdOpenapiCoverage(rootDir: string): Promise<GuardResult> {
  const violations: Violation[] = [];

  // OpenAPI 仕様ファイルを検索
  const specFiles = await glob('docs/02_architecture/api/*.yaml', {
    cwd: rootDir,
    absolute: true,
  });

  if (specFiles.length === 0) {
    return {
      status: 'ok',
      message: 'No OpenAPI spec files found, skipping FSD API coverage check',
    };
  }

  // FSD の shared/api/generated ディレクトリを検索
  const generatedDirs = await glob('**/src/shared/api/generated', {
    cwd: rootDir,
    ignore: ['**/node_modules/**'],
    absolute: true,
  });

  if (generatedDirs.length === 0) {
    // OpenAPI 仕様があるのに生成ディレクトリがない
    for (const specFile of specFiles) {
      violations.push({
        file: path.relative(rootDir, specFile),
        rule: 'fsd-openapi-coverage',
        message: `OpenAPI spec exists but no generated API client found in shared/api/generated. Run code generation.`,
      });
    }

    return {
      status: violations.length > 0 ? 'warn' : 'ok',
      violations: violations.length > 0 ? violations : undefined,
      message:
        violations.length > 0
          ? 'OpenAPI 仕様に対応する生成物がありません。コード生成を実行してください。'
          : undefined,
    };
  }

  // 各仕様ファイルに対応する生成物があるか確認
  for (const specFile of specFiles) {
    const content = fs.readFileSync(specFile, 'utf-8');
    const document: OpenAPIDocument = yaml.parse(content);

    if (!document.paths || Object.keys(document.paths).length === 0) {
      continue;
    }

    // 生成ディレクトリに何らかのファイルがあるか確認
    for (const generatedDir of generatedDirs) {
      const generatedFiles = await glob('**/*.ts', {
        cwd: generatedDir,
        absolute: true,
      });

      if (generatedFiles.length === 0) {
        violations.push({
          file: path.relative(rootDir, generatedDir),
          rule: 'fsd-openapi-coverage',
          message: `Generated API directory is empty. Run code generation from OpenAPI spec.`,
        });
      }

      // index.ts があるか確認（エクスポート用）
      const hasIndex = fs.existsSync(path.join(generatedDir, 'index.ts'));
      if (!hasIndex && generatedFiles.length > 0) {
        violations.push({
          file: path.relative(rootDir, generatedDir),
          rule: 'fsd-openapi-coverage',
          message: `Generated API directory should have index.ts to export types and functions.`,
        });
      }
    }
  }

  return {
    status: violations.length > 0 ? 'warn' : 'ok',
    violations: violations.length > 0 ? violations : undefined,
    message:
      violations.length > 0
        ? `Found ${violations.length} FSD OpenAPI coverage issue(s). shared/api/generated が最新の状態か確認してください。`
        : undefined,
  };
}
