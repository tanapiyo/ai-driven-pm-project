/* eslint-disable no-console */
/**
 * @what ガードレール実行の統一ラッパー
 * @why ガードレールごとにログ形式がばらつくと集計・判定が不安定になるため、形式を標準化
 * @failure ガードレールが失敗した場合、詳細なエラーメッセージと共に非0終了
 */

export interface GuardResult {
  status: 'ok' | 'error' | 'warn';
  violations?: Violation[];
  message?: string;
}

export interface Violation {
  file: string;
  line?: number;
  message: string;
  rule: string;
}

export interface RunGuardOptions {
  /** ガードレールの識別子 */
  guardId: string;
  /** ガードレールの実行関数 */
  exec: () => Promise<GuardResult>;
  /** パッケージ名（ログ用） */
  packageName?: string;
  /** 詳細ログを出力するか */
  verbose?: boolean;
}

/**
 * ガードレールを実行し、結果を標準化されたフォーマットで出力
 */
export async function runGuard(options: RunGuardOptions): Promise<GuardResult> {
  const { guardId, exec, packageName = 'unknown', verbose = false } = options;
  const startedAt = Date.now();

  if (verbose) {
    console.log(`🔍 Running guard: ${guardId}...`);
  }

  try {
    const result = await exec();
    const durationMs = Date.now() - startedAt;

    // ログ出力
    logResult(guardId, packageName, result, durationMs);

    return result;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const result: GuardResult = {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
    logResult(guardId, packageName, result, durationMs);
    return result;
  }
}

function logResult(
  guardId: string,
  packageName: string,
  result: GuardResult,
  durationMs: number
): void {
  const icon = result.status === 'ok' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
  console.log(`${icon} [${guardId}] ${result.status} (${durationMs}ms)`);

  if (result.violations && result.violations.length > 0) {
    console.log('');
    for (const v of result.violations) {
      const location = v.line ? `${v.file}:${v.line}` : v.file;
      console.log(`   ${location}`);
      console.log(`     └─ ${v.rule}: ${v.message}`);
    }
    console.log('');
  }

  if (result.message && result.status !== 'ok') {
    console.log(`   ${result.message}`);
  }
}

/**
 * 複数のガードレール結果を集約
 */
export function aggregateResults(results: GuardResult[]): GuardResult {
  const allViolations: Violation[] = [];
  let hasError = false;
  let hasWarn = false;

  for (const result of results) {
    if (result.status === 'error') hasError = true;
    if (result.status === 'warn') hasWarn = true;
    if (result.violations) {
      allViolations.push(...result.violations);
    }
  }

  return {
    status: hasError ? 'error' : hasWarn ? 'warn' : 'ok',
    violations: allViolations.length > 0 ? allViolations : undefined,
  };
}
