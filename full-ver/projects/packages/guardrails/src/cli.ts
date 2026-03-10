#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * @what ガードレール CLI
 * @why 開発者がローカルで、CIで、同じコマンドでガードレールを実行できるようにする
 * @failure 1つでもガードレールが失敗したら非0終了（push/CI を止める）
 *
 * Usage:
 *   pnpm guardrail                    # 全ガードレールを実行
 *   pnpm guardrail --guard repository-result  # 特定のガードレールのみ
 *   pnpm guardrail --verbose          # 詳細ログ
 */

import * as path from 'node:path';
import { runGuard, aggregateResults, type GuardResult } from './runner.js';
import {
  checkRepositoryResult,
  checkDomainEventCausation,
  checkOpenapiRouteCoverage,
  checkValueObjectImmutability,
  checkUsecaseDependency,
  checkDomainPurity,
  checkFsdPublicApi,
  checkFsdLayerDependency,
  checkFsdOpenapiCoverage,
} from './guards/index.js';

interface GuardDefinition {
  id: string;
  description: string;
  exec: (rootDir: string) => Promise<GuardResult>;
}

/**
 * 利用可能なガードレール一覧
 * 新しいガードレールはここに追加
 */
const GUARDS: GuardDefinition[] = [
  // === Clean Architecture (API) 用 ===
  {
    id: 'repository-result',
    description: 'リポジトリがResult<T>を返しているか検査',
    exec: checkRepositoryResult,
  },
  {
    id: 'domain-event-causation',
    description: 'ドメインイベントに因果メタが付いているか検査',
    exec: checkDomainEventCausation,
  },
  {
    id: 'openapi-route-coverage',
    description: 'OpenAPI仕様のルートが実装されているか照合',
    exec: checkOpenapiRouteCoverage,
  },
  {
    id: 'value-object-immutability',
    description: 'Value Objectの不変性を検査',
    exec: checkValueObjectImmutability,
  },
  {
    id: 'usecase-dependency',
    description: 'UseCaseが禁止されたレイヤーをimportしていないか検査',
    exec: checkUsecaseDependency,
  },
  {
    id: 'domain-purity',
    description: 'Domain層が外部依存を持たず純粋なビジネスロジックか検査',
    exec: checkDomainPurity,
  },
  // === Feature-Sliced Design (Web) 用 ===
  {
    id: 'fsd-public-api',
    description: 'FSDスライスがindex.tsで公開APIを持っているか検査',
    exec: checkFsdPublicApi,
  },
  {
    id: 'fsd-layer-dependency',
    description: 'FSDレイヤー間の依存方向を検査',
    exec: checkFsdLayerDependency,
  },
  {
    id: 'fsd-openapi-coverage',
    description: 'OpenAPI仕様とshared/api/generatedの整合性を検査',
    exec: checkFsdOpenapiCoverage,
  },
];

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const guardFilter = args.find((arg) => arg.startsWith('--guard='))?.split('=')[1];
  const listMode = args.includes('--list');

  // ガードレール一覧を表示
  if (listMode) {
    console.log('\n📋 Available guardrails:\n');
    for (const guard of GUARDS) {
      console.log(`  ${guard.id}`);
      console.log(`    ${guard.description}`);
    }
    console.log('');
    process.exit(0);
  }

  // プロジェクトルートを決定（apps/ または packages/ を含むディレクトリ）
  let rootDir = process.cwd();

  // 親ディレクトリを辿って apps/ または packages/ を探す
  while (rootDir !== '/') {
    const appsDir = path.join(rootDir, 'apps');
    const packagesDir = path.join(rootDir, 'packages');
    try {
      const stats = await import('node:fs').then((fs) => {
        try {
          fs.statSync(appsDir);
          return true;
        } catch {
          try {
            fs.statSync(packagesDir);
            return true;
          } catch {
            return false;
          }
        }
      });
      if (stats) break;
    } catch {
      // continue
    }
    rootDir = path.dirname(rootDir);
  }

  console.log('\n🛡️  Horizontal Guardrails - AI向けアーキテクチャ検査\n');
  console.log(`   Root: ${rootDir}`);
  console.log('');

  // 実行するガードレールをフィルタ
  const guardsToRun = guardFilter ? GUARDS.filter((g) => g.id === guardFilter) : GUARDS;

  if (guardsToRun.length === 0) {
    console.error(`❌ Guard not found: ${guardFilter}`);
    console.log('   Use --list to see available guards');
    process.exit(1);
  }

  // 全ガードレールを実行
  const results: GuardResult[] = [];

  for (const guard of guardsToRun) {
    const result = await runGuard({
      guardId: guard.id,
      exec: () => guard.exec(rootDir),
      verbose,
    });
    results.push(result);
  }

  // 結果を集約
  const aggregate = aggregateResults(results);

  console.log('\n' + '='.repeat(60));

  if (aggregate.status === 'ok') {
    console.log('✅ All guardrails passed!');
    console.log('');
    process.exit(0);
  } else if (aggregate.status === 'warn') {
    console.log('⚠️  Some warnings detected');
    console.log('');
    process.exit(0); // 警告は通す
  } else {
    console.log('❌ Guardrail check failed!');
    console.log('');
    console.log('   Fix the violations above and try again.');
    console.log('   Guardrails help maintain Clean Architecture + DDD constraints.');
    console.log('');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Guardrail execution failed:', error);
  process.exit(1);
});
