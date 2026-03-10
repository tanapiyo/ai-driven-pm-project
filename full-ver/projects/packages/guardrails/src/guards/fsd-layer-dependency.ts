/**
 * @what FSD レイヤー間の依存方向を検査
 * @why FSD のレイヤー構造を維持し、依存の逆転を防ぐため
 * @failure 禁止されたレイヤー間依存を検出した場合に非0終了
 *
 * FSD レイヤー構造（上から下へのみ依存可能）:
 *   app → widgets → features → entities → shared
 *
 * 検査対象:
 * - src/shared/** が他レイヤーを import していないか
 * - src/entities/** が features/widgets/app を import していないか
 * - src/features/** が widgets/app を import していないか
 * - src/widgets/** が app を import していないか
 */

import { glob } from 'glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GuardResult, Violation } from '../runner.js';

// レイヤー依存ルール（許可されるレイヤー）
const ALLOWED_IMPORTS: Record<string, string[]> = {
  shared: ['shared'],
  entities: ['entities', 'shared'],
  features: ['features', 'entities', 'shared'],
  widgets: ['widgets', 'features', 'entities', 'shared'],
  app: ['app', 'widgets', 'features', 'entities', 'shared'],
};

// レイヤー検出用正規表現
const LAYER_IMPORT_PATTERNS = {
  app: /from\s+['"][^'"]*(?:\/app\/|@\/app\/|\.\.\/app\/)[^'"]*['"]/g,
  widgets: /from\s+['"][^'"]*(?:\/widgets\/|@\/widgets\/|\.\.\/widgets\/)[^'"]*['"]/g,
  features: /from\s+['"][^'"]*(?:\/features\/|@\/features\/|\.\.\/features\/)[^'"]*['"]/g,
  entities: /from\s+['"][^'"]*(?:\/entities\/|@\/entities\/|\.\.\/entities\/)[^'"]*['"]/g,
  shared: /from\s+['"][^'"]*(?:\/shared\/|@\/shared\/|\.\.\/shared\/)[^'"]*['"]/g,
};

function detectLayer(filePath: string): string | null {
  if (filePath.includes('/shared/')) return 'shared';
  if (filePath.includes('/entities/')) return 'entities';
  if (filePath.includes('/features/')) return 'features';
  if (filePath.includes('/widgets/')) return 'widgets';
  if (filePath.includes('/app/')) return 'app';
  return null;
}

export async function checkFsdLayerDependency(rootDir: string): Promise<GuardResult> {
  const violations: Violation[] = [];

  // FSD 構造のファイルを検索
  const files = await glob('**/src/{app,widgets,features,entities,shared}/**/*.{ts,tsx}', {
    cwd: rootDir,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/generated/**',
    ],
    absolute: true,
  });

  if (files.length === 0) {
    return {
      status: 'ok',
      message: 'No FSD files found, skipping layer dependency check',
    };
  }

  for (const file of files) {
    const sourceLayer = detectLayer(file);
    if (!sourceLayer) continue;

    const allowedLayers = ALLOWED_IMPORTS[sourceLayer];
    const content = fs.readFileSync(file, 'utf-8');

    // 各レイヤーへの import をチェック
    for (const [targetLayer, pattern] of Object.entries(LAYER_IMPORT_PATTERNS)) {
      if (allowedLayers.includes(targetLayer)) continue;

      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const position = match.index;
        let lineNumber = 1;
        for (let i = 0; i < position; i++) {
          if (content[i] === '\n') lineNumber++;
        }

        violations.push({
          file: path.relative(rootDir, file),
          line: lineNumber,
          rule: 'fsd-layer-dependency',
          message: `Layer '${sourceLayer}' cannot import from '${targetLayer}'. FSD dependency: app → widgets → features → entities → shared`,
        });
      }
    }
  }

  return {
    status: violations.length > 0 ? 'error' : 'ok',
    violations: violations.length > 0 ? violations : undefined,
    message:
      violations.length > 0
        ? `Found ${violations.length} FSD layer dependency violation(s). FSD のレイヤー依存方向に従ってください。`
        : undefined,
  };
}
