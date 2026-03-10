# API Contract

OpenAPI 定義と TypeScript クライアントの自動生成を管理するパッケージ。

## 概要

このパッケージは以下を提供します：

1. **OpenAPI 定義** (`openapi.yaml`)
   - API の単一の正として機能
   - 手書きの API 型定義を排除

2. **TypeScript クライアント** (`src/generated/`)
   - orval によって自動生成
   - 型安全な API 呼び出し

## 使い方

### 型の生成

```bash
pnpm openapi:generate
```

### 生成物の差分チェック（CI用）

```bash
pnpm openapi:check
```

生成物がコミットされていない場合、このコマンドは失敗します。

### アプリケーションでの使用

```typescript
import { configureApiClient, getUsers } from '@monorepo/api-contract';

// 初期化（アプリ起動時に1回）
configureApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  getAuthToken: () => localStorage.getItem('auth_token'),
});

// API 呼び出し
const users = await getUsers({ limit: 10 });
```

## 運用方針

### 生成物のコミット

生成物はリポジトリにコミットします。理由：

- CI で毎回生成する必要がなくなる
- 変更差分を PR でレビューできる
- 生成ツールのバージョン不一致による問題を防ぐ

### ワークフロー

1. `openapi.yaml` を編集
2. `pnpm openapi:generate` を実行
3. 生成物と一緒にコミット
4. CI の `openapi:check` が差分を検出 → 生成忘れを防止

### 手書き禁止

`src/generated/` 以下のファイルは手動編集禁止です。
ESLint でパス制限をかけています。
