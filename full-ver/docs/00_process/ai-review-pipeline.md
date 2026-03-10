# AI レビューパイプライン（ローカルエージェント）

このドキュメントは、コーディングエージェント（Claude Code）のパイプライン内で実行される
AI レビューの仕組みと運用ルールを定義します。

---

## 1. 概要

AI レビューは **GitHub Actions（CI）ではなく、ローカルのコーディングエージェント内**で実行されます。

```
コーディングエージェント パイプライン:

Phase 1: コンテキスト理解
Phase 2: 実装
Phase 3: 品質ゲート（format → lint → typecheck → test → build）
Phase 4: コミット + プッシュ
Phase 5: PR 作成
Phase 6: AI レビュー + PR コメント投稿  ← ★ ここ
```

**なぜ CI ではなくローカルか:**

| 観点 | CI (GitHub Actions) | ローカルエージェント |
|------|--------------------|--------------------|
| API キー管理 | リポジトリ Secret が必要 | ローカル認証で完結 |
| コスト制御 | 全 PR で API コール | エージェント実行時のみ |
| P0 自動修正 | 不可（別ワークフロー要） | 即座に修正 → 再プッシュ |
| 再現性 | ワークフロー定義に依存 | プロンプトテンプレートで保証 |
| フィードバックループ | 非同期（CI 完了待ち） | 同期（即座に反映） |

---

## 2. レビュー観点（4 次元）

すべての AI レビューは以下の 4 次元を**必ず**カバーします。

### 2.1 AC（受け入れ条件）検証 — Primary Gate

| チェック項目 | 説明 |
|-------------|------|
| AC 定義の正しさ | Given/When/Then 形式で定義されているか |
| エビデンスの有無 | 各 AC にテスト・コード・ドキュメントのエビデンスがあるか |
| 前提条件の妥当性 | AC がビジネス的に正しい前提に基づいているか |
| エラーパス・境界条件 | ハッピーパスだけでなく異常系もカバーしているか |
| 根本原因 vs 症状 | 問題の根本原因を解決しているか、表面的な対処か |

### 2.2 セキュリティ

| チェック項目 | 説明 |
|-------------|------|
| ハードコードされた秘密情報 | API キー、パスワード、トークンがコードに含まれていないか |
| インジェクション | SQL インジェクション、XSS、コマンドインジェクション |
| バリデーション | Zod による入力検証が境界で行われているか |
| 認証・認可バイパス | 認証チェックの欠落、権限チェックの不備 |

### 2.3 アーキテクチャ

| チェック項目 | 説明 |
|-------------|------|
| レイヤー違反 | Clean Architecture の依存方向（domain ← infrastructure） |
| FSD クロススライス | Feature-Sliced Design のスライス間直接インポート |
| OpenAPI-first | API 変更時に仕様を先に更新しているか |
| generated ファイル | 自動生成ファイルを直接編集していないか |

### 2.4 コード品質

| チェック項目 | 説明 |
|-------------|------|
| エラーハンドリング | 例外処理、エッジケースの考慮 |
| オーバーエンジニアリング | AC の範囲を超えた不要な変更 |
| 命名規則 | 変数名・関数名の明確さ |
| テストカバレッジ | 変更箇所に対するテストの有無 |

---

## 3. レビューの実行フロー

```
6.1 Safe diff 取得
 │  └─ .env*, secrets/, *.pem, *.key を除外
 ↓
6.2 Claude 自己レビュー（adversarial）
 │  └─ 4 次元すべてをカバー → P0/P1/P2 分類
 ↓
6.3 Codex クロスモデルレビュー（MUST attempt, non-blocking）
 │  ├─ 成功 → 結果を統合
 │  └─ 失敗 → "unavailable" を記録して続行
 ↓
6.4 P0 自動修正サイクル（最大 2 回）
 │  ├─ P0 あり → 修正 → 品質ゲート → 新コミット → 再レビュー
 │  └─ P0 なし → 次へ
 ↓
6.5 PR コメント投稿（MUST）
 │  └─ 🤖 AI Review (automated) コメントを投稿
 ↓
6.6 投稿確認
    └─ コメントの存在を検証
```

---

## 4. PR コメントフォーマット

投稿される AI レビューコメントは以下の構造に従います:

```markdown
## 🤖 AI Review (automated)

> Reviewers: Claude (self-review) + Codex MCP (cross-model)
> Pipeline: /autopilot Phase 6
> This review is advisory. It does not block merging.

### Review Dimensions
- ✅/⚠️ AC Verification
- ✅/⚠️ Security
- ✅/⚠️ Architecture
- ✅/⚠️ Code Quality

### P0 — Blockers
- [file:line] description
  - Why: risk explanation
  - Fix: suggested minimal fix

### P1 — Important
- [file:line] description

### P2 — Suggestions
- [file:line] description

### AC Verification
| AC | Status | Evidence |
|----|--------|----------|
| AC-1: description | ✅ | `tests/xxx.test.ts` |
| AC-2: description | ⚠️ | evidence missing |

### Codex Cross-Model Review
- P0: ...
- P1: ...
- P2: ...
- Note: Cross-model findings are advisory

### Summary
One paragraph overall assessment.

---
*To act on findings: P0 → fix before merge. P1 → fix in this PR or track.
P2 → optional improvements.*
```

**レビュー不可時のフォールバック:**

```markdown
## 🤖 AI Review (automated)

> Status: Unavailable — AI review could not be completed.
> This does not block merging. Run `/pr-check` locally for manual review.
```

---

## 5. コーディングエージェントによる消費フロー

AI レビューコメントは固定構造に従うため、コーディングエージェントが機械的に処理できます。

### 消費手順

```bash
# 1. PR コメントを取得
gh pr view <PR_NUMBER> --json comments --jq '.comments[].body'

# 2. AI Review コメントを検出
# ヘッダー: "## 🤖 AI Review (automated)"

# 3. P0/P1 を抽出
# セクション: "### P0 — Blockers", "### P1 — Important"
# 各行: "- [file:line] description" 形式

# 4. P0 を修正
# 該当ファイル:行を特定 → minimal diff で修正

# 5. 再プッシュ → 新しい AI レビューサイクルがトリガーされる
```

### 再現性の保証

| 要素 | 保証方法 |
|------|---------|
| レビュープロンプト | `codex-review/SKILL.md` に固定テンプレート |
| 出力フォーマット | P0/P1/P2 ヘッダー + `[file:line]` 形式 |
| コメント検出 | `🤖 AI Review (automated)` マーカー |
| 修正サイクル | P0 修正 → 再プッシュ → 再レビュー（最大 2 回） |

---

## 6. ガードレール

### Always-loaded ルール

`.claude/rules/09-ai-review.md` が常にコンテキストに読み込まれ、
AI レビューコメントの投稿を**必須**として強制します。

### 品質ゲートとの関係

```
品質ゲート（Phase 3）:  format → lint → typecheck → test → build
AI レビュー（Phase 6）:  Claude review → Codex review → PR comment
```

品質ゲートは**自動化された形式チェック**、AI レビューは**意味的なレビュー**です。
両方を通過して初めてパイプラインが完了します。

### フォールバック方針

| 状況 | 対応 |
|------|------|
| Claude 自己レビュー失敗 | 発生しない（エージェント自身が実行） |
| Codex MCP タイムアウト | `"unavailable"` を記録して続行 |
| Codex MCP レートリミット | フォールバックモデルを試行 → skip |
| PR コメント投稿失敗 | 1 回リトライ → Final Report に結果を含める |
| AI レビュー全体が不可能 | フォールバックコメントを投稿 |

**原則: AI レビュー失敗は PR マージをブロックしない。**

---

## 関連ドキュメント

| ファイル | 説明 |
|----------|------|
| `.claude/rules/09-ai-review.md` | Always-loaded ガードレールルール |
| `.claude/commands/autopilot.md` | Autopilot パイプライン（Phase 6） |
| `.claude/skills/codex-review/SKILL.md` | Codex クロスモデルレビュープロンプト |
| `.claude/skills/pr-review-governance/SKILL.md` | PR レビューガバナンス |
| `.claude/skills/codex-mcp-model/SKILL.md` | Codex モデル選定ポリシー |
| `docs/02_architecture/adr/0014-ai-review-pipeline.md` | ADR: 設計判断の記録 |
