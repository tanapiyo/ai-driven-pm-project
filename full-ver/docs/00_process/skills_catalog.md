# Skills Catalog

AI エージェントが適用すべき再利用可能なスキル。
各スキルは特定のトリガーで発動し、失敗パターンを先回りで防ぐ。

---

## Skill.Read_Contract_First

### Trigger
- 新タスク開始時
- リポジトリが未知の場合

### Purpose
AGENTS.md と process.md を読み、制約を把握する。

### Steps
1. `AGENTS.md` を読む
2. `docs/00_process/process.md` を読む
3. Golden Commands と Golden Outputs を把握
4. 不明点を質問するか、assumptions を docs に明記

### Output
理解した制約を短くまとめ、これからの作業の順序を提示

### Prompt Reference
`prompts/skills/read_contract_first.md`

---

## Skill.DocDD_Spec_First

### Trigger
- 機能実装のリクエスト
- アーキテクチャ変更のリクエスト

### Purpose
Spec/Plan/Tasks を先に作成してから実装に移る。

### Steps
1. `spec.md` を更新/作成（FR/NFR/AC）
2. 必要なら `plan.md` / ADR を作成
3. `tasks.md` に分解（順序・依存・リスク）

### Guardrails
- Spec/Plan/Tasks がない限り Implementer に移行しない
- AC は Given/When/Then 形式で書く

### Output
- `.specify/specs/<id>/spec.md`
- `.specify/specs/<id>/plan.md`
- `.specify/specs/<id>/tasks.md`

### Prompt Reference
`prompts/skills/docdd_spec_first.md`

---

## Skill.Minimize_Diff

### Trigger
- CI failing
- レビューフィードバック

### Purpose
原因を1つに絞り、最小差分に収束させる。

### Steps
1. 原因を1つに絞る（再現 → 影響範囲 → 最小修正）
2. 変更を分割（docs-only / code-only / refactor）
3. 不要変更を revert

### Output
最小差分 PR に収束させる

### Prompt Reference
`prompts/skills/minimize_diff.md`

---

## Skill.Fix_CI_Fast

### Trigger
- `./tools/contract <cmd>` failing

### Purpose
CI を素早く修復し、3ループで止める。

### Steps
1. 失敗ログを貼る（要点だけ）
2. 依存 → 設定 → 環境の順で切り分け
3. format → lint → typecheck → test → build の順で直す
4. 3ループで直らなければ root cause を `docs/03_quality/` に記録して止める

### Output
- 修正コミット
- 再発防止メモ

### Prompt Reference
`prompts/skills/fix_ci_fast.md`

---

## Skill.Policy_Docs_Drift

### Trigger
- コード変更時

### Purpose
必要な docs 更新を同 PR で実施する。

### Steps
1. 変更タイプを分類（arch/ui/api/db/behavior）
2. 必要な docs 更新をチェックリスト化
   - アーキ変更 → ADR 更新
   - API 変更 → API docs 更新
   - UI 変更 → UI requirements 更新
   - 振る舞い変更 → Spec/AC 更新
3. 更新が必要なら同じ PR で更新

### Output
Docs 更新漏れゼロを担保

### Prompt Reference
`prompts/skills/policy_docs_drift.md`

---

## Skill.Review_As_Staff

### Trigger
- Reviewer 起動時

### Purpose
Staff 相当の視点でレビューを行う。

### Steps
1. DocDD リンク（Spec/Plan/ADR/Impact/AC/Test/Release）を確認
2. NFR（性能/セキュリティ/運用）観点の穴を探す
3. rollback/feature flag/移行計画の妥当性を確認
4. 必要なら PR を分割提案

### Output
レビューコメント（優先度: P0/P1/P2）

### Priority Levels
| Priority | Description |
|----------|-------------|
| P0 | ブロッカー（マージ不可） |
| P1 | 重要（対応必須） |
| P2 | 推奨（対応推奨） |

### Prompt Reference
`prompts/skills/review_as_staff.md`

---

## Skill.PR_Review_Governance

### Trigger
- PR レビュー時
- 受入基準の達成可否を評価するとき
- FSD/DDD/OAS/Guardrails の準拠を確認するとき

### Purpose
ビジネス観点（Spec/Plan/AC/テスト）とアーキテクチャ観点（FSD/DDD/OAS/開発ルール）を同時にレビューし、根拠リンク付きで指摘を出す。

### Steps
1. `.claude/skills/pr-review-governance/scripts/discover-review-rules.sh` で最新ルールソースを巡回
2. Spec/Plan/Tasks/ADR と変更差分を紐付ける
3. AC とテスト（ユニット/統合/E2E）のカバレッジを確認
4. FSD/DDD/OAS/Guardrails/Golden Commands の準拠を確認
5. P0/P1/P2 でレビューコメントを作成し、各指摘にルールリンクを付与

### Output
- ルール参照リンク付きレビューコメント
- AC カバレッジ結果
- 新規に検出したルールソース一覧

### Prompt Reference
`.claude/skills/pr-review-governance/SKILL.md`

---

## Skill.DevContainer_Safe_Mode

### Trigger
- DevContainer/firewall の問題
- `dangerously-skip-permissions` のリクエスト

### Purpose
安全な範囲で復旧し、記録を残す。

### Steps
1. firewall allowlist を確認（`docs/devcontainer.md`）
2. doctor コマンドで原因切り分け
3. balanced へ切替が必要なら理由を docs に残す
4. 危険操作は safe プロファイルでは禁止。必要なら明示的手順に従う

### Output
- 安全な範囲での復旧手順
- 記録（なぜ問題が起きたか）

### Prompt Reference
`prompts/skills/devcontainer_safe_mode.md`

---

## Skill.OpenAPI_Contract_First

### Trigger
- HTTP API を設計するとき
- HTTP API を利用/実装するとき
- 外部 API と連携するとき

### Purpose
OpenAPI 仕様を先に定義し、ドキュメント・クライアント・サーバースタブを自動生成する。

### Steps
1. `docs/02_architecture/api/` に OpenAPI 仕様（YAML/JSON）を作成
2. 仕様をレビュー（エンドポイント/スキーマ/エラー形式）
3. コード生成ツールでクライアント/サーバースタブを生成
4. 生成されたコードをベースに実装
5. 仕様と実装の乖離をCIでチェック（lint/validation）

### Guardrails
- 手書きでHTTPクライアント/サーバーを実装しない（生成コードをベースにする）
- API変更時は必ず OpenAPI 仕様を先に更新
- 仕様と実装の乖離を許容しない

### Recommended Tools
| Language | Client Generator | Server Generator |
|----------|------------------|------------------|
| TypeScript | openapi-typescript, orval | express-openapi-validator |
| Python | openapi-python-client | FastAPI (native) |
| Go | oapi-codegen | oapi-codegen |
| Rust | openapi-generator | poem-openapi |

### Output
- `docs/02_architecture/api/*.yaml` - OpenAPI 仕様
- 生成されたクライアント/サーバーコード
- CI での仕様バリデーション設定

### Prompt Reference
`prompts/skills/openapi_contract_first.md`

---

## Skill.Horizontal_Guardrails

### Trigger
- 新規実装開始時
- コードレビュー時
- CI失敗時（ガードレール関連）

### Purpose
ESLint boundaries + カスタムガードレールで Clean Architecture + DDD の制約を静的に検査し、AIが暴走してもアーキテクチャが崩壊しない仕組みを維持する。

### Philosophy
「横のガードレール」とは、**どう作るか**（非機能・実装品質・アーキテクチャ）を静的解析で検証する仕組み。

| ガードレール | 検証対象 | 検証方法 |
|-------------|---------|---------|
| 横のガードレール | どう作るか（非機能） | 静的解析 |
| 縦のガードレール | 何を提供するか（機能） | テスト実行 |

### Guardrails

#### ESLint (eslint-plugin-boundaries)
レイヤー間の依存制約を検査:
```
presentation → usecase → domain ← infrastructure
```

#### Custom Guardrails
| Guard ID | 検査内容 |
|----------|----------|
| `repository-result` | リポジトリが Result<T> を返すか |
| `domain-event-causation` | ドメインイベントに因果メタがあるか |
| `openapi-route-coverage` | OpenAPI仕様と実装の整合性 |
| `value-object-immutability` | Value Object の不変性 |
| `usecase-dependency` | UseCase の依存方向 |

### Commands
```bash
./tools/contract lint        # ESLint + boundaries
./tools/contract guardrail   # カスタムガードレール
```

### Comment Pattern
```typescript
/**
 * @what 何を検査/実装するか（1行）
 * @why なぜこの検査/実装が必要か（理由）
 * @failure 違反時にどうなるか（ガードレールのみ）
 */
```

### Output
- ガードレール実行結果（GREEN/RED）
- 違反箇所の特定と修正提案

### Prompt Reference
`prompts/skills/horizontal_guardrails.md`

---

## Skill.Read_Master_Spec

### Trigger
- 既存機能の変更時
- 子 Spec を作成する前

### Purpose
親となる Master Spec を読み、コンテキストを理解する。

### Steps
1. 関連する Spec を `.specify/specs/` から検索
2. 親 Spec の FR/NFR/AC を読む
3. 依存関係や制約を把握
4. 子 Spec で変更が必要な場合は親 Spec も更新

### Guardrails
- 子 Spec だけを変更して親 Spec を無視しない
- 親 Spec の AC に影響がある場合は親 Spec も更新する

### Output
- 理解したコンテキストのサマリ
- 親 Spec への変更が必要かどうかの判断

### Prompt Reference
`prompts/skills/read_master_spec.md`

---

## Skill.Impact_Analysis

### Trigger
- 既存機能の変更時
- アーキテクチャ変更時
- 依存関係が複雑な変更時

### Purpose
変更の影響範囲を分析し、Plan に記載する。

### Steps
1. 変更対象のファイルを特定
2. 依存しているファイル/モジュールを特定（静的解析）
3. 影響を受ける機能を列挙
4. テストへの影響を評価
5. 影響分析を `plan.md` の Impact Analysis セクションに記載

### Analysis Checklist
- [ ] 直接変更するファイル
- [ ] import/export で依存しているファイル
- [ ] 同じ型/インターフェースを使用しているファイル
- [ ] 影響を受けるテスト
- [ ] 影響を受ける CI/CD パイプライン
- [ ] 影響を受けるドキュメント

### Output
- `plan.md` の Impact Analysis セクション
- 影響を受けるファイルのリスト
- リスク評価

### Prompt Reference
`prompts/skills/impact_analysis.md`

---

## Skill.Template_Spec

### Trigger
- 新規 Spec 作成時

### Purpose
テンプレートを使用して一貫性のある Spec を作成する。

### Steps
1. `.specify/templates/spec.md` をコピー
2. 各セクションを埋める
3. FR は具体的で検証可能に
4. AC は Given/When/Then 形式で
5. NFR は数値で定義可能なものを優先

### Template Location
- `.specify/templates/spec.md`
- `.specify/templates/plan.md`
- `.specify/templates/tasks.md`

### Output
- 完成した Spec（テンプレート準拠）

---

## Skill.Codex_Review

### Trigger
- `/pr-check` 実行時（自動）
- クロスモデルレビューの明示的リクエスト時

### Purpose
Codex MCP（GPT ベース）を使用した追加 PR レビューで、異なる LLM の視点を提供する。

### Steps
1. `git diff origin/main...HEAD` を取得（センシティブファイル除外）
2. `mcp__codex__codex` にレビュープロンプトを送信
4. レスポンスを P0/P1/P2 形式にパース
5. Codex MCP 失敗時: 警告出力、Claude のみで続行

### Guardrails
- センシティブファイル（`.env*`, `secrets/`, `*.pem`, `*.key`）は diff から除外
- プロンプトテンプレートで diff を `<diff>...</diff>` で区切る
- エラー詳細は露出しない

### Output
- P0/P1/P2 形式のレビューコメント（advisory、非ブロッキング）
- Combined Review Summary テーブル

### Prompt Reference
`.claude/skills/codex-review/SKILL.md`

---

## Skill.UX_Psychology_Pack

### Trigger
- UI変更を含む Feature/Issue 着手時
- PRレビュー時（UI変更がある場合）
- 四半期テンプレートレビュー時

### Purpose
UX心理学の概念を設計・AC定義・レビュー・学習サイクルに統合し、ユーザー体験を根拠に基づいて設計する。

### Steps
1. `rules/catalog.json` から関連する概念を検索
2. `templates/ux-psychology-impact-assessment.md` で適用概念を選定
3. `templates/ux-psychology-acceptance-criteria.md` で UX固有の AC を追加
4. 実装時に `@ux-concept` / `@ux-reason` コメントで追跡可能にする
5. `templates/ux-psychology-pr-checklist.md` でレビュー時にチェック
6. ダークパターン防止チェックを必ず実施

### Guardrails
- UX心理学の概念をユーザーの不利益に使用しない（ダークパターン禁止）
- Impact Assessment なしで UX 概念を適用しない
- 効果測定の基盤を設計時に組み込む

### Output
- UX Impact Assessment
- UX固有の AC
- レビューチェック結果

### Resources
- Pack: `skill/agent/design-system/ux-psychology/`
- Process: `skill/agent/design-system/ux-psychology/docs/process.md`
- Governance: `skill/agent/design-system/ux-psychology/docs/governance.md`

---

## Skill.API_Designer

### Trigger
- HTTP API 設計時（新規エンドポイント追加、OpenAPI spec 作成）
- RESTful パス設計レビュー時
- 非 RESTful な設計パターンの修正時（`/search` サブパス等）

### Purpose
要件からリソースモデルを導出し、RESTful なパス設計と OAS 駆動の API 実装を行う。

### Steps
1. 要件からリソース（名詞）を抽出する
2. リソース階層と関係性を定義する（コレクション / 単体 / サブリソース）
3. HTTP メソッドと CRUD 操作をマッピングする
4. OpenAPI spec を `projects/packages/api-contract/openapi.yaml` に記述する
5. `./tools/contract openapi-check` でバリデーション
6. `./tools/contract openapi-generate` でコード生成

### Guardrails
- `/search` サブパスは禁止（コレクションエンドポイントのクエリパラメータで代替）
- パスに動詞を含めない（RPC スタイル禁止）
- `{id}` は `{resourceId}` のようにリソース固有名にする
- 実装前に必ず OAS spec を定義する（spec first）

### Output
- RESTful なエンドポイント設計
- OAS spec（`openapi.yaml`）の追加・更新
- 生成コード（handler, type definitions）

### Prompt Reference
`.claude/skills/api-designer/SKILL.md`

---

## Quick Reference Table

| ID | Trigger | Purpose |
|----|---------|---------|
| `Skill.Read_Contract_First` | 新タスク開始時 | AGENTS.md と process.md を読み、制約を把握 |
| `Skill.DocDD_Spec_First` | 機能/アーキ変更時 | Spec/Plan/Tasks を先に作成してから実装 |
| `Skill.Read_Master_Spec` | 既存機能変更時 | 親 Spec を読みコンテキスト理解 |
| `Skill.Impact_Analysis` | 変更時 | 影響範囲を分析し Plan に記載 |
| `Skill.Template_Spec` | 新規 Spec 作成時 | テンプレートで一貫性確保 |
| `Skill.Minimize_Diff` | CI失敗/レビュー指摘時 | 原因を1つに絞り最小差分に収束 |
| `Skill.Fix_CI_Fast` | contract failing | 依存→設定→環境の順で切り分け、3ループで止める |
| `Skill.Policy_Docs_Drift` | コード変更時 | 必要なdocs更新を同PRで実施 |
| `Skill.Review_As_Staff` | Reviewer起動時 | DocDDリンク確認、NFR観点、rollback妥当性 |
| `Skill.PR_Review_Governance` | PRレビュー時 | 受入基準とFSD/DDD/OAS準拠を根拠リンク付きで確認 |
| `Skill.DevContainer_Safe_Mode` | firewall/permission問題時 | allowlist確認、safeプロファイル維持 |
| `Skill.OpenAPI_Contract_First` | HTTP API設計/実装時 | OpenAPI仕様を先に定義、コード生成活用 |
| `Skill.Horizontal_Guardrails` | 実装/レビュー時 | 横のガードレールでアーキテクチャ維持 |
| `Skill.Codex_Review` | `/pr-check`実行時 | Codex MCP (GPT) によるクロスモデルレビュー |
| `Skill.UX_Psychology_Pack` | UI変更時 | UX心理学の概念で設計判断を根拠付け |
| `Skill.API_Designer` | HTTP API設計/設計レビュー時 | RESTful リソースモデリングと OAS 駆動設計 |
