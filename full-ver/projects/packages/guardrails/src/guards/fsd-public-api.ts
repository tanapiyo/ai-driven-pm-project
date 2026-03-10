/**
 * @what FSD スライスが index.ts で public API を公開しているか検査
 * @why スライス内部への直接アクセスを防ぎ、モジュール境界を明確にするため
 * @failure index.ts が存在しないスライスを検出した場合に非0終了
 *
 * 検査対象:
 * - src/features 配下の各スライス
 * - src/entities 配下の各スライス
 * - src/widgets 配下の各スライス
 * 各スライスに index.ts が存在することを確認
 */

import { glob } from 'glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GuardResult, Violation } from '../runner.js';

const LAYER_COMMENT_PATTERN = /@layer\s+(features|entities|widgets)/;
const SEGMENT_COMMENT_PATTERN = /@segment\s+(\w+)/;

export async function checkFsdPublicApi(rootDir: string): Promise<GuardResult> {
  const violations: Violation[] = [];

  // FSD レイヤーのスライスディレクトリを検索
  const sliceDirs = await glob('**/src/{features,entities,widgets}/*/', {
    cwd: rootDir,
    ignore: ['**/node_modules/**', '**/dist/**'],
    absolute: true,
  });

  if (sliceDirs.length === 0) {
    // FSD構造がなければスキップ
    return {
      status: 'ok',
      message: 'No FSD slice directories found, skipping public API check',
    };
  }

  for (const sliceDir of sliceDirs) {
    const indexPath = path.join(sliceDir, 'index.ts');
    const indexTsxPath = path.join(sliceDir, 'index.tsx');

    // index.ts または index.tsx が存在するか確認
    const hasIndex = fs.existsSync(indexPath) || fs.existsSync(indexTsxPath);

    if (!hasIndex) {
      violations.push({
        file: path.relative(rootDir, sliceDir),
        rule: 'fsd-public-api',
        message: `Slice directory must have index.ts or index.tsx as public API entry point`,
      });
      continue;
    }

    // index.ts の内容を検査
    const actualIndexPath = fs.existsSync(indexPath) ? indexPath : indexTsxPath;
    const content = fs.readFileSync(actualIndexPath, 'utf-8');

    // @layer と @segment コメントがあるか確認（推奨）
    if (!LAYER_COMMENT_PATTERN.test(content)) {
      violations.push({
        file: path.relative(rootDir, actualIndexPath),
        rule: 'fsd-public-api',
        message: `index.ts should have @layer comment (e.g., @layer features)`,
      });
    }

    if (!SEGMENT_COMMENT_PATTERN.test(content)) {
      violations.push({
        file: path.relative(rootDir, actualIndexPath),
        rule: 'fsd-public-api',
        message: `index.ts should have @segment comment (e.g., @segment auth)`,
      });
    }

    // export 文があるか確認
    if (!content.includes('export')) {
      violations.push({
        file: path.relative(rootDir, actualIndexPath),
        rule: 'fsd-public-api',
        message: `index.ts should export public API (no exports found)`,
      });
    }
  }

  return {
    status: violations.length > 0 ? 'warn' : 'ok',
    violations: violations.length > 0 ? violations : undefined,
    message:
      violations.length > 0
        ? `Found ${violations.length} FSD public API issue(s). スライスは index.ts で public API を明示的に公開してください。`
        : undefined,
  };
}
