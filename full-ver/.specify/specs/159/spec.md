# Spec: Next.js SSR スケルトン作成（FE-001）

Issue: #159
Linear: COD-35

## 概要

Next.js App Router ベースの SSR スケルトンを構築する。
既存の `projects/apps/web/` に対して、ルートページ (`/`) およびヘルスチェックページ (`/health`) が正常に動作することを確認する。

## 受け入れ条件（AC）

- [AC-001] `pnpm web dev` でローカル開発サーバーが起動できる
- [AC-002] `/` ページが SSR でレンダリングされ、認証状態に基づいてリダイレクトする
- [AC-003] `/health` ページが HTTP 200 を返す

## スコープ

### In Scope

- ルートページ (`/`) のローディング UI + リダイレクトロジック
- ヘルスチェックページ (`/health`)
- ダークモード対応（`dark:` バリアント、`neutral-*` カラー）
- ユニットテスト

### Out of Scope

- 認証機能の実装（既存の `useAuthStore` を利用）
- ダッシュボード・ログインページの実装
- API エンドポイント

## 技術方針

- Next.js App Router (`app/` ディレクトリ)
- FSD アーキテクチャに準拠
- Tailwind CSS でダークモード対応
