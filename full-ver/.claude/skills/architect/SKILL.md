---
name: architect
description: >
  Architecture review, ADR creation, and impact analysis for this repository.
  Use this skill when making infrastructure decisions, evaluating technology
  choices (framework migration, library adoption, new patterns), reviewing
  layer compliance (Clean Architecture / FSD), or determining whether a
  change needs an ADR. Also use when the user asks to "create an ADR",
  "review architecture", "check layer dependencies", or discusses migration,
  refactoring rationale, or design trade-offs. Even if the user doesn't
  explicitly say "architecture", use this skill for changes that affect
  system structure, data flow, or cross-cutting concerns.
globs:
  - "docs/02_architecture/**"
alwaysApply: false
---

# Architect Skill

## ADR の作成

### いつ ADR が必要か

| 変更種別 | ADR 必須? | 根拠 |
|---------|----------|------|
| アーキ変更（新インフラ/設計） | 必須 | AGENTS.md DoD |
| リファクタリング | 必須（なぜリファクタするか） | AGENTS.md DoD |
| 新フレームワーク/ライブラリ導入 | 推奨 | 技術選定の記録 |
| API 設計変更 | 推奨 | 互換性影響の記録 |
| バグ修正・UI 変更のみ | 不要 | — |

迷ったら ADR を書く。書かなくて後悔するより、書いて無駄になるほうが安い。

### 作成手順

1. **次番号を確認**: `ls -1 docs/02_architecture/adr/0*.md | sort | tail -1` で最大番号 +1
2. **テンプレートをコピー**: `cp docs/02_architecture/adr/TEMPLATE.md docs/02_architecture/adr/NNNN-<title>.md`
3. **セクションを埋める**: TEMPLATE.md のコメントに従い、背景・決定内容・結果・検討した代替案を記述
4. **ステータスを設定**: 初回は `Proposed`、レビュー承認後に `Accepted - YYYY-MM-DD`
5. **Supersedes 関係**: 既存 ADR を置き換える場合、新 ADR に `Supersedes ADR-NNNN` と記載し、旧 ADR のステータスを `Superseded by ADR-MMMM` に更新する（両方向のリンクを維持）

> **注意**: architect agent は read-only（plan mode）のため、ADR の内容を設計・提案する。
> ファイルの作成・コミットは implementer agent またはユーザーが行う。

**SSOT**: `docs/02_architecture/adr/TEMPLATE.md` がフォーマットの唯一の定義元。

### DocDD での位置づけ

ADR は DocDD Stage 3 (Plan) の成果物。前後の関係：

```
Stage 2: Spec (FR/NFR/AC)  ← ADR の背景となる要件はここで定義済み
    ↓
Stage 3: Plan / ADR / Impact  ← ここで ADR を作成
    ↓
Stage 4: Contract (OpenAPI / Test Design)  ← ADR の決定に基づいて契約を定義
```

## Architecture Review の進め方

レビューを求められたら、以下の観点で調査する。

### 1. レイヤー分析

**Backend (Clean Architecture)**:
- 依存方向が内側を向いているか（presentation → usecase → domain ← infrastructure）
- Domain 層がフレームワーク・DB・外部 I/O に依存していないか
- UseCase 層にビジネスロジックが漏れていないか

→ 詳細は `ddd-clean-architecture` スキル参照

**Frontend (FSD)**:
- レイヤー依存が上から下か（app → widgets → features → entities → shared）
- cross-feature import がないか
- shared 層が React/Next.js に依存していないか

→ 詳細は `fsd-frontend` スキル参照

### 2. 影響範囲の評価

変更がどのモジュール・レイヤーに波及するかを整理する。
リスクは「変更の大きさ × 失敗時の影響度」で判定。

### 3. ADR 要否の判定

上の「いつ ADR が必要か」テーブルに照らして判定する。
判定結果は Output Format に含めること。

### Output Format

```markdown
## Architecture Review

### Summary
[設計判断の概要]

### Current State
[変更対象の現在のアーキテクチャ・実装状態を記述する。
 推奨ではなく事実を記載し、レビュー者が現状を把握できるようにする]

### Layer Analysis
- [境界違反の有無]
- [依存方向の問題]

### Impact Assessment
| Area | Impact | Risk |
|------|--------|------|
| [コンポーネント] | [影響内容] | High/Medium/Low |

### Migration Strategy
[破壊的変更やデータ移行を伴う場合に記載する。
 段階的な移行手順・ロールバック方法・並行稼働期間を含める。
 該当しない場合は「N/A」]

### ADR Required?
- [Yes/No] — [理由]

### Recommendations
- [設計上の提案]
```

## Deliverables

| Path | Purpose |
|------|---------|
| `docs/02_architecture/adr/*.md` | ADR |
| `docs/02_architecture/repo_structure.md` | リポジトリ構造 |
| `docs/02_architecture/impact_analysis_template.md` | Impact Analysis テンプレート |

## Related Skills

| Skill | いつ参照するか |
|-------|--------------|
| `ddd-clean-architecture` | Backend レイヤー分析時 |
| `fsd-frontend` | Frontend レイヤー分析時 |
| `api-designer` | API 設計変更のレビュー時 |
| `repo-conventions` | 命名規約・PR ルール確認時 |
