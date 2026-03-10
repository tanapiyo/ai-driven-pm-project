# Plan: Next.js SSR スケルトン作成（FE-001）

Issue: #159
Spec: `.specify/specs/159/spec.md`

## 実装ステップ

### Step 1: ルートページの修正

- ファイル: `projects/apps/web/src/app/page.tsx`
- 変更内容:
  - React import を追加（vitest 互換性）
  - ダークモード対応クラスを追加（`bg-neutral-50 dark:bg-neutral-900`, `dark:border-primary-400`）

### Step 2: ユニットテスト作成

- ファイル: `projects/apps/web/src/app/page.test.tsx`
- テスト内容:
  - ローディングスピナーの表示確認
  - 未認証時の `/login` リダイレクト確認
  - 認証済み時の `/dashboard` リダイレクト確認

### Step 3: 品質ゲート

- format → lint → typecheck → test → build の順で実行

## 影響ファイル

| ファイル | 変更種別 |
|---------|---------|
| `projects/apps/web/src/app/page.tsx` | 修正 |
| `projects/apps/web/src/app/page.test.tsx` | 新規 |
