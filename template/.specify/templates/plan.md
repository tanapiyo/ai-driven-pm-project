# Plan: [機能名]

<!-- Plan は「どう作るか」を定義するドキュメント。AI（implementer）が書く。
     Spec の AC を全部カバーするタスクに分解することがゴール。
     ファイル名の規則: .specify/specs/<id>/plan.md
     書いたら人間にレビューしてもらう（推奨）。 -->

## 対応 Spec

- Spec: `./spec.md`
- Issue: #

## 実装アプローチ

<!-- どのレイヤーをどの順番で実装するかを書く。
     ファイル名・関数名など具体的なほど実装がブレない。
     例:
     1. domain 層: Expense エンティティと ApprovalStatus 値オブジェクトを追加
     2. usecase 層: SubmitExpenseUseCase を追加
     3. infrastructure 層: SlackNotificationService を実装
     4. presentation 層: /expense Slack コマンドのハンドラーを追加
     アーキテクチャ変更（新しいレイヤー・パターン導入）を伴う場合は ADR も作成する。 -->

## 影響範囲

<!-- 変更するファイルと変更内容を列挙する。
     新規作成は「新規」、既存変更は「変更: 〜を追加/修正/削除」と書く。
     例:
     | projects/apps/api/src/domain/expense/expense.entity.ts | 新規: Expense エンティティ |
     | projects/apps/api/src/usecase/expense/submit-expense.usecase.ts | 新規: SubmitExpenseUseCase |
     | projects/apps/api/src/composition/container.ts | 変更: DI 登録を追加 | -->

| ファイル / モジュール | 変更内容 |
|---------------------|---------|
| | |

## タスク分割

<!-- AC ごとにタスクを作る。1タスク = 1コミットが理想。
     depends_on: 前のタスクが終わらないと始められないものを書く。
     files: 変更するファイルパスを書く（後で parallel 実行するときに使う）。
     例:
     - [ ] **Task 1**: Expense エンティティを作成
       - 詳細: amount / purpose / date / status フィールドを持つ Entity
       - 対象ファイル: `projects/apps/api/src/domain/expense/expense.entity.ts`
       - AC: AC1（モーダル表示の前提となるドメインモデル）
       - depends_on: なし

     - [ ] **Task 2**: SubmitExpenseUseCase を作成
       - 詳細: Expense を生成して Repository に保存、Slack 通知を送る
       - 対象ファイル: `projects/apps/api/src/usecase/expense/submit-expense.usecase.ts`
       - AC: AC1, AC2
       - depends_on: Task 1 -->

- [ ] **Task 1**: [タスク名]
  - 詳細:
  - 対象ファイル: `path/to/file.ts`
  - AC: AC1
  - depends_on: なし

- [ ] **Task 2**: [タスク名]
  - 詳細:
  - 対象ファイル: `path/to/file.ts`
  - AC: AC2
  - depends_on: Task 1

## リスク・考慮事項

<!-- 実装中に詰まりそうな箇所・前提が崩れたときの影響を書く。
     「特になし」は OK（書かないより明示的に「なし」と書く）。
     例:
     | Slack API の rate limit | 承認通知の連続送信で 429 が返る可能性。バックオフ処理を追加する |
     | 既存の User テーブルの構造 | approval_role カラムが未定義。マイグレーションが必要かも | -->

| リスク | 対策 |
|--------|------|
| | |

## テスト計画

<!-- AC ごとにどのテストで確認するかを書く。
     「ユニットテスト」だけ書いても不十分。「何のユニットテストか」まで書く。
     例:
     | ユニットテスト | SubmitExpenseUseCase | 正常系: 申請が保存され通知が送られること |
     | ユニットテスト | Expense エンティティ | 異常系: 金額 0 円・マイナスがバリデーションエラーになること |
     | ユニットテスト | Slack コマンドハンドラー | 異常系: 空欄送信でエラーレスポンスを返すこと（AC2） | -->

| テスト種別 | 対象 | 確認内容 |
|-----------|------|---------|
| ユニットテスト | | |
| ユニットテスト | | |
