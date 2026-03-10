# ADR 運用ガイドライン

このドキュメントは Architecture Decision Records (ADR) の作成・レビュー・承認プロセスを定義します。

---

## 1. ADR とは

ADR（Architecture Decision Record）は、アーキテクチャ上の重要な決定を記録するドキュメントです。
「なぜこの設計を選んだか」を後から読み返せる形で残すことで、技術的負債の蓄積を防ぎます。

**SSOT（フォーマット定義）**: `docs/02_architecture/adr/TEMPLATE.md`

---

## 2. ADR が必要なケース（作成トリガー）

以下のいずれかに該当する変更では ADR を作成します。

| 変更種別 | ADR 必須? | 根拠 |
|---------|----------|------|
| アーキテクチャ変更（新インフラ・設計パターン導入） | **必須** | AGENTS.md DoD（アーキ変更） |
| リファクタリング（既存構造の再設計） | **必須** | AGENTS.md DoD（リファクタリング） |
| 新フレームワーク・ライブラリの採用 | **推奨** | 技術選定の記録として有用 |
| API 設計の互換性破壊変更 | **推奨** | 互換性影響の記録として有用 |
| レイヤー境界ルールの例外承認 | **必須** | `ddd-clean-architecture` スキルの「When to Break Rules」 |
| バグ修正・UI 変更のみ | 不要 | アーキテクチャへの影響なし |

> **判断に迷ったら ADR を書く。**
> 書かずに後悔するより、書いて無駄になるほうが安い。

---

## 3. ADR ライフサイクル

### ステータス遷移

```
Proposed → Accepted → Deprecated
                    → Superseded
```

| ステータス | 説明 | 遷移条件 |
|-----------|------|---------|
| **Proposed** | 提案中。まだ承認されていない | 作成時の初期ステータス |
| **Accepted** | 承認済み。現在適用中 | PR レビューで LGTM を受け、main にマージされた |
| **Deprecated** | 非推奨。別の方針に移行済みだが後続 ADR はない | Accepted の ADR を運用判断で廃止する場合。PR で変更し理由を記載する |
| **Superseded** | 後続 ADR に上書きされた | Accepted の ADR を新 ADR で置き換える場合。新 ADR 作成後、旧 ADR のステータスを `Superseded by ADR-NNNN` に更新する |

### Superseded 時の両方向リンク維持

```
# 新 ADR に記載
Supersedes ADR-0005

# 旧 ADR に記載
Superseded by ADR-0012
```

---

## 4. ADR 作成フロー

DocDD の Stage 3（Plan）で作成します。

```
Stage 2: Spec (FR/NFR/AC) — 背景となる要件はここで定義済み
    ↓
Stage 3: Plan / ADR / Impact  ← ADR を作成するフェーズ
    ↓
Stage 4: Contract (OpenAPI / Test Design) — ADR の決定に基づいて契約を定義
```

### 手順

#### Step 1: architect agent が設計・提案する

`architect` エージェント（または architect スキルを持つエージェント）が以下を行います:

1. 変更の影響範囲を分析する
2. ADR の内容（背景・決定内容・結果・代替案）を設計する
3. implementer に対して ADR ドラフトを提示する

> **注意**: `architect` エージェントは read-only（plan mode）のため、
> ファイルの作成・コミットは自身では行えません。

#### Step 2: implementer agent がファイルを作成する

`implementer` エージェント（またはユーザー）が以下を行います:

1. 次番号を確認する:

   ```bash
   ls -1 docs/02_architecture/adr/0*.md | sort | tail -1
   ```

2. テンプレートをコピーする:

   ```bash
   cp docs/02_architecture/adr/TEMPLATE.md docs/02_architecture/adr/NNNN-<title>.md
   ```

3. architect の設計内容を元にセクションを記述する
4. ステータスを `Proposed` に設定する
5. ブランチにコミットして PR を作成する

#### Step 3: PR レビューで承認される

PR レビュアーが以下を確認します:

- ADR の内容が TEMPLATE.md のフォーマットに準拠しているか
- 背景・決定内容・代替案が十分に記述されているか
- ステータスが適切か（新規は `Proposed`）

PR マージ後:

- ステータスを `Accepted - YYYY-MM-DD` に更新する
- （通常は同一 PR 内でマージ前に更新するか、フォローアップ PR で更新する）

---

## 5. レビュー・承認プロセス

### レビュー観点

| 観点 | チェック内容 |
|------|------------|
| **フォーマット** | TEMPLATE.md の必須セクションがすべて記載されているか |
| **背景の妥当性** | なぜこの決定が必要かが明確に説明されているか |
| **決定内容の明確性** | 何を決定したかが具体的に記述されているか |
| **代替案の検討** | 却下した代替案とその理由が記載されているか |
| **影響の記述** | ポジティブ・ネガティブな影響と緩和策が記載されているか |

### レビュアーの責務

- 技術的な正しさだけでなく、将来の読者にとって理解しやすいかを確認する
- 決定の根拠が薄い場合は追記を求める
- 承認（LGTM）は「この決定を理解し、適切と判断した」ことを意味する

### マージ後の運用

- ADR はマージ後は変更しない（読み取り専用の記録として扱う）
- 決定を覆す場合は新しい ADR を作成し、旧 ADR を Superseded にする

---

## 6. ファイル命名規則

```
docs/02_architecture/adr/NNNN-<descriptive-title>.md
```

- `NNNN`: 4 桁ゼロ埋め連番（例: `0014`）
- `<descriptive-title>`: 決定内容を表す英語スラッグ（ハイフン区切り）
- 次番号の確認: `ls docs/02_architecture/adr/0*.md | tail -1` で最大番号を確認し +1

---

## 7. architect agent の役割

`architect` エージェント（`.claude/agents/architect.md`）は **read-only（plan mode）** です。

| 役割 | 実施者 |
|------|--------|
| ADR の必要性判断 | architect エージェント |
| ADR 内容の設計・提案（ドラフト作成） | architect エージェント |
| ファイルの作成・コミット | implementer エージェント or ユーザー |
| PR レビュー・承認 | レビュアー（チームメンバー） |
| ステータスを Accepted に更新 | implementer エージェント or ユーザー |

---

## 8. 関連リソース

| リソース | 用途 |
|--------|------|
| `docs/02_architecture/adr/TEMPLATE.md` | ADR フォーマットの SSOT |
| `docs/02_architecture/adr/` | 既存 ADR 一覧 |
| `docs/00_process/process.md` | DocDD ステージ定義（Stage 3: Plan） |
| `.claude/skills/architect/SKILL.md` | architect スキルの詳細ワークフロー |
| `AGENTS.md` — Definition of Done | アーキ変更・リファクタリングの DoD |
