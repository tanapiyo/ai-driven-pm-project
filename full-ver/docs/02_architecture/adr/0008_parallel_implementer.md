# ADR-0008: 並列 Implementer アーキテクチャ

## Status

**Accepted** - 2026-02-07

## Context

ADR-0005 で導入した 5 エージェント並列アーキテクチャでは、read-only エージェント（repo-explorer, security-auditor, code-reviewer）は並列実行されるが、implementer は単一・逐次実行となっている。

独立したタスク群（例: backend domain 層 + frontend UI）を持つ機能では、複数の implementer を並列起動することで実装時間を短縮できる。しかし以下の課題がある：

1. **タスク依存関係**: `tasks.md` に機械可読な依存メタデータがない
2. **ファイル競合**: 複数エージェントが同一ファイルを変更するリスク
3. **アクセス制御**: Claude Code の Task ツールにファイルレベルのアクセス制御がない
4. **Git ロック**: 並列エージェントが同一リポジトリで Git 操作する際の競合

## Decision

### プロンプトベースファイルスコープ制約

Claude Code の Task ツールには技術的なファイルアクセス制御がないため、**プロンプトベースの制約**でファイルスコープを管理する。

```
各 implementer のプロンプトに以下を含める:
- 変更が許可されるファイルパスのリスト（排他的）
- スコープ外変更の禁止ルール
- コーディネーターによる事後検証
```

**根拠:**
- Claude Code サブエージェントはプロンプト制約を高い精度で遵守する
- 外部ツールやファイルロック機構が不要
- 事後検証で違反を検出可能
- 既存の Task ツール API と互換

### tasks.md 依存メタデータフォーマット

各タスクに以下のメタデータを付与:

```markdown
- [ ] **Task N**: タスク名
  - depends_on: [依存タスクID]     # 前提タスク（空=独立）
  - files: [変更対象ファイルパス]   # 排他スコープ
  - parallel_group: グループ名      # 同一グループ = 同一エージェント
```

### 実行フロー

```
/parallel-implement
  │
  ├── 1. tasks.md → 依存グラフ（DAG）構築
  ├── 2. 並列可能グループの特定
  ├── 3. ファイルスコープの割り当て
  │
  ├── 4. Wave 実行（並列）
  │   ├── Group A: implementer-1 (background)
  │   └── Group B: implementer-2 (background)
  │
  ├── 5. 共有ファイル（コーディネーター逐次処理）
  │
  └── 6. 整合性チェック
      ├── ./tools/contract format
      ├── ./tools/contract lint
      ├── ./tools/contract typecheck
      └── ./tools/contract test
```

### Git 操作の制約

- 並列エージェントは **ファイル書き込みのみ**（git add/commit 禁止）
- コーディネーターが全エージェント完了後に一括 commit
- これにより `.git/index` の競合を回避

### 共有ファイルの処理

DI container、barrel exports、設定ファイルなど複数グループが変更する可能性のあるファイルは:
- どのグループのスコープにも含めない
- `parallel_group: shared` としてマーク
- コーディネーターが最後に逐次処理

### フォールバック

| 条件 | 動作 |
|------|------|
| `parallel_group` メタデータなし | 逐次実行（単一 implementer） |
| パースエラー | 逐次実行にフォールバック |
| 循環依存検出 | 停止、ユーザーに報告 |
| ファイルスコープ重複 | 停止、ユーザーに報告 |

## Consequences

### Positive

- 独立タスクの実装時間を短縮（理論上 N 倍、実測は検証必要）
- tasks.md にタスク間の依存関係が明示される（ドキュメント品質向上）
- 既存ワークフロー（/kickoff）との後方互換性を維持

### Negative

- ファイルスコープ制約がプロンプトベース（技術的強制ではない）
- tasks.md のメタデータ記述が手動作業
- 並列エージェントのコンテキストウィンドウ消費が増加

### Mitigations

- 事後検証（git diff + ファイルスコープマッピング）で違反を検出
- メタデータなしの場合は安全な逐次実行にフォールバック
- 各エージェントは最小タスクセットで起動（コンテキスト節約）

## References

- ADR-0005: Claude Code サブエージェント統合
- Issue: #390
- Spec: `.specify/specs/parallel-implementer-390/spec.md`
