<!--
# ADR フォーマットルール

## 命名規則
- ファイル名: `NNNN-<descriptive-title>.md` または `NNNN_<descriptive_title>.md`
  - 例: `0014-my-decision.md`
- NNNN は 4 桁ゼロ埋め連番
- 次番号の決定: `ls docs/02_architecture/adr/0*.md | tail -1` で最大番号を確認し +1

## 言語
- ヘッダー（# ADR-NNNN:, ## セクション名）: 日本語を推奨（ADR-0013 以降の規約）
- 本文: 日本語を推奨。英語混在は可だが、セクション名は統一すること

## 必須セクション
1. タイトル行 (`# ADR-NNNN: タイトル`)
2. ステータス (`## ステータス`) — Proposed | Accepted | Deprecated | Superseded
3. 背景 (`## 背景`) — なぜこの決定が必要か
4. 決定内容 (`## 決定内容`) — 何を決定したか
5. 結果 (`## 結果`) — Positive / Negative / Mitigations
6. 検討した代替案 (`## 検討した代替案`) — 却下した案とその理由

## ステータス値
- **Proposed**: 提案中、まだ承認されていない
- **Accepted**: 承認済み、現在適用中
- **Deprecated**: 非推奨、別の方針に移行済み
- **Superseded**: 後続 ADR に上書きされた（`Superseded by ADR-NNNN` と記載）

## テンプレートの更新
このファイルが ADR フォーマットの SSOT（Single Source of Truth）。
architect スキル (`.claude/skills/architect/SKILL.md`) がこのファイルを参照する。
-->

# ADR-NNNN: タイトル

## ステータス

Proposed

<!-- 承認後は "Accepted - YYYY-MM-DD" に変更。Spike / Epic がある場合は "Accepted (Spike #NNN)" のように記載 -->

## 背景

<!-- なぜこの決定が必要か。解決すべき課題・制約・要件を記述する -->

## 決定内容

<!-- 何を決定したか。決定の根拠を含めて記述する -->

## 結果

<!-- この決定の影響を記述する -->

### ポジティブな影響

- <!-- 利点 -->

### ネガティブな影響

- <!-- 欠点・トレードオフ -->

### 緩和策

- <!-- ネガティブな影響への対策（ある場合） -->

## 検討した代替案

<!-- 却下した代替案とその理由を記述する -->

### 代替案 A: （案の名称）

- **概要**: <!-- 案の説明 -->
- **却下理由**: <!-- なぜこの案を選ばなかったか -->
