# Language Rules (Always Applied)

## Output Language Policy (MUST)

AI が生成するすべての自然言語コンテンツは **日本語** で出力すること。

### 対象（日本語で出力 MUST）

| 対象                           | 例                                       |
| ------------------------------ | ---------------------------------------- |
| PR 説明文（Summary / Changes） | `gh pr create --body "..."` のボディ全体 |
| `docs/` 内のドキュメント       | 設計書、プロセスドキュメント、ADR 等     |
| AI レビューコメント            | `## 🤖 AI Review (automated)` の本文     |
| Issue コメント                 | `gh issue comment` のボディ              |
| エラーメッセージ・状況説明     | BLOCKED: / WARNING: 等のユーザー向け説明 |
| Phase 遷移サマリー             | 「現在地:」「次のアクション:」等         |

### 対象外（英語を維持 MUST NOT 変更）

| 対象外                                   | 例                                               |
| ---------------------------------------- | ------------------------------------------------ |
| コード中の識別子（変数名・関数名・型名） | `createUser`, `UserRepository`, `isValid`        |
| Conventional Commits の type/scope       | `feat(auth):`, `fix(api):`, `docs(readme):`      |
| 技術用語・固有名詞                       | `TypeScript`, `Prisma`, `OpenAPI`, `Zod`         |
| CLI コマンド・フラグ                     | `./tools/contract lint`, `git commit`            |
| ファイルパス・ディレクトリ名             | `src/domain/user/`, `AGENTS.md`                  |
| コードブロック内のコメント（英語が自然） | `// TODO: refactor this`, `// NOTE: side-effect` |
| CI が検証する固定セクション見出し         | `## AC Verification`, `## Quality Gates`         |

## PR 説明文の言語要件

`/autopilot` が生成する PR 説明文の各セクションは以下の言語ルールに従う:

| セクション                | 言語   | 備考                                          |
| ------------------------- | ------ | --------------------------------------------- |
| Summary（概要）           | 日本語 |                                               |
| Changes（変更点リスト）   | 日本語 |                                               |
| AC Verification テーブル  | 混在   | **見出しは `## AC Verification` 英語固定（CI 検証対象）**。AC 内容・Evidence 説明は日本語 |
| Quality Gates テーブル    | 混在   | **見出しは `## Quality Gates` 英語固定**。Gate 名は英語維持、Status/備考は日本語          |
| `Closes #<N>` フッター    | 英語   | GitHub のキーワード構文のため英語固定         |
| `Linear: <KEY>` フッター  | 英語   | Linear Integration のキーワードのため英語固定 |
| `:robot: Generated with…` | 英語   | テンプレート固定テキスト                      |

## ドキュメント生成の言語要件

`docs/` 配下に新規ドキュメントを作成または更新する場合:

- 見出し・本文・表のすべてを日本語で記述する
- ADR（`docs/02_architecture/adr/*.md`）の本文も日本語で記述する
- コードブロック内のコメントは英語でも可

## MUST NOT

| MUST NOT                                                  | Why                              |
| --------------------------------------------------------- | -------------------------------- |
| PR 説明文の Summary/Changes を英語で記述する              | チームレビュー効率の低下         |
| docs/ 内のドキュメントを英語で新規作成する                | 可読性・保守性の低下             |
| AI レビューコメントの本文を英語で記述する                 | レビュー内容の理解に支障をきたす |
| 識別子・Conventional Commits の type/scope を日本語にする | コード・CI への影響が発生する    |
