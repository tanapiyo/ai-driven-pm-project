# Development Process (DocDD)

このリポジトリは **Document-Driven Development (DocDD)** を採用しています。
すべての変更は、ドキュメント（Spec / Plan / AC）から始まります。

---

## Stages

```
1. Product Identity / PRD
       ↓
2. Spec (FR / NFR / AC)
       ↓
3. Plan (Architecture / ADR / Impact)
       ↓
4. Contract Definition (OpenAPI / Test Design)
       ↓
5. Tasks (Implementation Plan)
       ↓
6. Implement (テストを通す実装)
       ↓
7. QA Evidence
       ↓
8. Release Plan / Delivery
```

**テストファースト原則**: ユニットテストなき実装は正解がわからない

---

## Stage Details

### 1. Product Identity / PRD

**目的**: プロダクトの方向性を定義する

**成果物**:

- [docs/01_product/identity.md](../01_product/identity.md) - Vision / Mission / Principles
- [docs/01_product/prd.md](../01_product/prd.md) - Product Requirements Document

### 2. Spec (FR / NFR / AC)

**目的**: 機能要件・非機能要件・受入基準を明確にする

**成果物**:

- `.specify/specs/<feature_id>/spec.md`
- `.specify/specs/<feature_id>/plan.md` (非自明な変更の場合)
- `.specify/specs/<feature_id>/tasks.md` (推奨)

**テンプレート**: `.specify/templates/` にテンプレートを用意

```bash
# 新規 Spec の作成
FEATURE_ID="my-feature"
mkdir -p ".specify/specs/${FEATURE_ID}"
cp .specify/templates/spec.md ".specify/specs/${FEATURE_ID}/spec.md"
cp .specify/templates/plan.md ".specify/specs/${FEATURE_ID}/plan.md"
cp .specify/templates/tasks.md ".specify/specs/${FEATURE_ID}/tasks.md"
```

**必須項目**:

- Functional Requirements (FR)
- Non-Functional Requirements (NFR)
- Acceptance Criteria (AC) - **Given/When/Then 形式**

**検証**:

```bash
# Spec の品質チェック
./.specify/scripts/validate-spec.sh ".specify/specs/${FEATURE_ID}/spec.md"

# Spec の存在チェック（実装前に必須）
./.specify/scripts/check-spec-exists.sh "${FEATURE_ID}"
```

### 3. Plan (Architecture / ADR / Impact)

**目的**: 技術的な設計と影響範囲を明確にする

**成果物**:

- [docs/02_architecture/adr/](../02_architecture/adr/) - Architecture Decision Records
  - [TEMPLATE.md](../02_architecture/adr/TEMPLATE.md) - 新規 ADR 作成時はこれをコピー
  - [adr_guidelines.md](./adr_guidelines.md) - ADR 運用ガイドライン（作成トリガー・ライフサイクル・フロー）
- Impact Analysis（必要に応じて）

### 4. Contract Definition (OpenAPI / Test Design)

**目的**: 実装の「正解」を先に定義する（テストファースト原則）

**なぜ重要か**:

- ユニットテストなき実装は正解がわからない
- API 仕様なき実装はフロントエンド/バックエンドの認識がずれる

**成果物**:

- `docs/02_architecture/api/*.yaml` - OpenAPI 仕様（API がある場合）
- `projects/**/tests/` - ユニットテスト（テストケースを先に定義）
- 型定義の生成（`./tools/contract generate-api`）

**手順**:

1. OpenAPI 仕様を定義（→ `Skill.OpenAPI_Contract_First`）
2. ユニットテストを作成（期待する振る舞いを定義）
3. 統合テストを作成（E2E シナリオを定義）

### 5. Tasks (Implementation Plan)

**目的**: 実装タスクを分解し、見積もりを行う

**成果物**:

- GitHub Issues / Project Board
- タスク分解（1 タスク = 1 PR が理想）
- 各タスクと対応するテストの紐付け

### 6. Implement (テストを通す実装)

**目的**: 定義済みテストを通すコードを実装する

**手順**:

1. 赤（テスト失敗）を確認
2. 最小限の実装でテストを通す
3. リファクタリング

**必須**:

```bash
./tools/contract format
./tools/contract lint
./tools/contract test
./tools/contract build
```

### 7. QA Evidence

**目的**: 受入基準を満たしていることを証明する

**成果物**:

- テスト結果のスクリーンショット / ログ
- AC チェックリストの完了
- **AC Verification テーブルの記入（PR body に必須）** — 全 AC に対してテスト証跡を示す
- レビュアーによる AC の正しさの確認（ビジネス要件の妥当性）

### 8. Release Plan / Delivery

**目的**: 安全にリリースする

**成果物**:

- [docs/04_delivery/release_process.md](../04_delivery/release_process.md)
- リリースノート

---

## Required Artifacts per Change Type

<!-- NOTE: このテーブルは変更種別ごとの成果物クイックリファレンスです。
     DoD（完了定義・機械的検証を含む3列トレーサビリティ）の SSOT は AGENTS.md です。
     → AGENTS.md の「Definition of Done (per Change Type)」セクションを参照してください。 -->

| Change Type          | Required Artifacts                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| **新機能**           | Spec + Plan + OpenAPI/Tests (先) + Tasks + Impl                                                       |
| **アーキ変更**       | ADR + Impact Analysis + Migration Plan                                                                |
| **UI 変更**          | UI Requirements + AC update + Design system update + **Evidence** (Screenshots light+dark, UI states) |
| **バグ修正**         | Issue link + Tests + (Spec update if behavior change)                                                 |
| **リファクタリング** | ADR (why) + Tests (no behavior change)                                                                |
| **依存更新**         | Changelog review + Tests                                                                              |

---

## Definition of Done (DoD)

変更種別ごとの完了定義（DoD ↔ 成果物 ↔ 機械的検証）は **AGENTS.md を SSOT** として管理しています。

→ [AGENTS.md — Definition of Done (per Change Type)](../../AGENTS.md#definition-of-done-per-change-type)

**AC レビュー完了の DoD への追加（すべての変更種別共通）:**

feat/fix PR では、以下がすべて満たされていることを DoD の一部とします:

- AC Verification テーブルが PR body に存在している
- すべての AC にテスト証跡（テストパス/スクリーンショット/CI ログ）が示されている
- レビュアーが AC の正しさ（ビジネス要件の妥当性）を確認している

---

## Kanban DoR/DoD (Frontend)

フロントエンド変更時の各カンバン列における Ready/Done 条件を定義する。

| Column               | DoR (Ready の条件)                                                                                  | DoD (Done の条件) |
| -------------------- | --------------------------------------------------------------------------------------------------- | ----------------- |
| **Ready for Dev**    | Issue に画面ID・AC定義済み / UI状態パースペクティブ確認済み / Screen spec 存在                      | -                 |
| **In Progress**      | Worktree作成済み / `/kickoff` 完了 / AC抽出・UI State AC追記済み                                    | -                 |
| **Ready for Review** | PR作成（`Closes #`付き） / Quality gates 全パス / Screenshots提供（light+dark） / UI states実装済み | -                 |
| **Done**             | PR merged / QA evidence記録済み                                                                     | -                 |

**Frontend-specific quality gates**: `e2e` は UI 変更時に必須。`./tools/contract e2e` で実行。

---

## PR Checklist

- [ ] Spec が存在し、AC が定義されている
- [ ] **AC Verification テーブルが PR body に記入され、各 AC にテスト証跡がある**
- [ ] **ユニットテストが新規コード・修正コードに追加されている（MUST、ドキュメントのみの変更を除く）**
- [ ] 関連する Docs が更新されている
- [ ] `./tools/contract lint` が通る
- [ ] `./tools/contract test` が通る
- [ ] `./tools/contract build` が通る
- [ ] PR テンプレが埋められている

> **ユニットテストなし PR の扱い**: 新規コード・修正コードに対応するユニットテストが存在しない PR はマージしない。
> レビュアーは AC Verification テーブルでテスト証跡を確認し、テストがない場合は必ず指摘する。
> 詳細は [AGENTS.md#definition-of-done-per-change-type](../../AGENTS.md#definition-of-done-per-change-type) を参照。

---

## DocDD Enforcement

**実装前に必ず Spec が存在することを確認する。**

### 自動チェック

1. `/kickoff` コマンド - Spec 存在チェック（Step 1）
2. `.specify/scripts/check-spec-exists.sh` - CLI から手動チェック
3. `.specify/scripts/validate-spec.sh` - Spec 品質チェック

### スキルによる強制

| Skill                    | Trigger           | Purpose                        |
| ------------------------ | ----------------- | ------------------------------ |
| `Skill.DocDD_Spec_First` | 機能/アーキ変更時 | Spec/Plan/Tasks を先に作成     |
| `Skill.Read_Master_Spec` | 既存機能変更時    | 親 Spec を読みコンテキスト理解 |
| `Skill.Impact_Analysis`  | 変更時            | 影響範囲を分析し Plan に記載   |
| `Skill.Template_Spec`    | 新規 Spec 作成時  | テンプレートで一貫性確保       |

詳細は `docs/00_process/skills_catalog.md` を参照。

---

## Links

- [AGENTS.md](../../AGENTS.md) - Canonical Instructions
- [docs/00_process/skills_catalog.md](./skills_catalog.md) - Skills Catalog
- [docs/03_quality/template_acceptance_criteria.md](../03_quality/template_acceptance_criteria.md) - Template AC
- [docs/04_delivery/release_process.md](../04_delivery/release_process.md) - Release Process
- [.specify/templates/](.specify/templates/) - Spec/Plan/Tasks Templates
