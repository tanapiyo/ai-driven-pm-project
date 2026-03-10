# Guardrails - アーキテクチャ違反の機械的検出

このドキュメントは、モノレポ全体で適用される「破れないガードレール」を定義します。
**ゴールは違反を CI で機械的に RED にすること**です。

---

## 概要

| アプリ | アーキテクチャ | ガードレール設定 |
|--------|--------------|-----------------|
| `apps/api` | Clean Architecture | `eslint.config.js` (ルート) |
| `apps/web` | Feature-Sliced Design (FSD) | `apps/web/eslint.config.js` |

---

## 1. Feature-Sliced Design (FSD) レイヤー依存ルール

### レイヤー構造

```
src/
├── app/        # Next.js App Router（ルーティング/レイアウト/プロバイダ）
├── widgets/    # 複合UIブロック（ヘッダー、サイドバー等）
├── features/   # ユーザー操作（ログイン、投稿作成等）
├── entities/   # ビジネスエンティティ（ユーザー、商品等）
└── shared/     # 共通ユーティリティ（UI、API、config等）
    ├── api/        # OpenAPI生成物 + HTTPラッパー
    ├── ui/         # 共通UIコンポーネント
    ├── lib/        # ユーティリティ関数
    ├── config/     # 環境変数ラッパー
    └── types/      # 共通型定義
```

### 依存方向（✅ 許可 / ❌ 禁止）

| From ↓ / To → | app | widgets | features | entities | shared |
|---------------|-----|---------|----------|----------|--------|
| **app**       | ✅  | ✅      | ✅       | ✅       | ✅     |
| **widgets**   | ❌  | ✅      | ✅       | ✅       | ✅     |
| **features**  | ❌  | ❌      | ✅       | ✅       | ✅     |
| **entities**  | ❌  | ❌      | ❌       | ✅       | ✅     |
| **shared**    | ❌  | ❌      | ❌       | ❌       | ✅     |

### app レイヤーへの import 禁止

`app` は組み立て層なので、外部から参照させません。

```typescript
// ❌ 禁止
import { something } from '@/app/providers';

// ✅ 正しい
// app 内でのみ使用する
```

---

## 2. Public API ルール（深い import 禁止）

### ルール

features / entities / widgets は **index.ts 経由でのみ** import できます。

### ✅ 正しい例

```typescript
import { useAuth, LoginForm } from '@/features/auth';
import { User, UserCard } from '@/entities/user';
import { Header } from '@/widgets/header';
```

### ❌ 禁止例

```typescript
// スライス内部への直接アクセス
import { useAuth } from '@/features/auth/model/useAuth';
import { User } from '@/entities/user/model/types';
import { Header } from '@/widgets/header/ui/Header';
```

### ESLint エラーメッセージ

```
features スライスは index.ts 経由でのみ import できます。例: @/features/auth
```

---

## 3. Import スタイル統一

### @/* エイリアスの使用

レイヤーをまたぐ import は `@/*` エイリアスを使用します。

### ✅ 正しい例

```typescript
import { Button } from '@/shared/ui';
import { useAuth } from '@/features/auth';
```

### ❌ 禁止例

```typescript
// 相対パスでのレイヤー越境
import { Button } from '../../shared/ui';
import { useAuth } from '../../../features/auth';
```

### tsconfig.json 設定

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 4. 危険な API の禁止

### HTTP クライアント直叩き禁止

```typescript
// ❌ 禁止
import axios from 'axios';
import ky from 'ky';
const res = await fetch('/api/users');

// ✅ 正しい
import { apiClient } from '@/shared/api';
const users = await apiClient('/users');
```

### process.env 直接参照禁止

```typescript
// ❌ 禁止（shared/config 以外で）
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// ✅ 正しい
import { getConfig } from '@/shared/config';
const { apiBaseUrl } = getConfig();
```

### Node.js 専用モジュール禁止（クライアント領域）

```typescript
// ❌ 禁止（クライアントコードで）
import fs from 'fs';
import path from 'path';

// Server Components / API Routes でのみ使用可
```

---

## 5. OpenAPI ガードレール

### 生成フロー

```
packages/api-contract/openapi.yaml
        ↓ pnpm openapi:generate
packages/api-contract/src/generated/
        ↓ ビルド
apps/web/src/shared/api/generated/
```

### コマンド

| コマンド | 説明 |
|---------|------|
| `pnpm openapi:generate` | OpenAPI から型/クライアントを生成 |
| `pnpm openapi:check` | 生成物が最新か検証（CI で使用） |

### 生成物コミット方針

生成物は **リポジトリにコミット** します。

理由:
- CI で毎回生成する必要がない
- 変更差分を PR でレビューできる
- 生成ツールのバージョン不一致による問題を防ぐ

### ワークフロー

1. `openapi.yaml` を編集
2. `pnpm openapi:generate` を実行
3. 生成物と一緒にコミット
4. CI の `openapi:check` が差分を検出 → 生成忘れを防止

### 手書き API 型定義の禁止

`**/apiTypes.ts` や `**/api-types.ts` のような手書きの API 型定義ファイルは作成禁止です。
OpenAPI 定義から生成された型のみを使用してください。

---

## 6. カスタムガードレール（@monorepo/guardrails）

ESLint では検出できないアーキテクチャ違反をカスタムガードレールで検査します。

### インストール・実行

```bash
cd projects/packages/guardrails
pnpm guardrail           # 全ガードレールを実行
pnpm guardrail --list    # 利用可能なガードレール一覧
pnpm guardrail --guard=fsd-public-api  # 特定のガードレールのみ実行
```

### Clean Architecture (API) 用ガードレール

| Guard ID | 検査内容 |
|----------|----------|
| `repository-result` | リポジトリが `Result<T>` を返しているか |
| `domain-event-causation` | ドメインイベントに因果メタ（causationId/correlationId/emittedAt）があるか |
| `openapi-route-coverage` | OpenAPI 仕様のルートが実装されているか |
| `value-object-immutability` | Value Object の不変性が保たれているか |
| `usecase-dependency` | UseCase が禁止されたレイヤーを import していないか |

### Feature-Sliced Design (Web) 用ガードレール

| Guard ID | 検査内容 |
|----------|----------|
| `fsd-public-api` | スライスが index.ts で公開 API を持っているか |
| `fsd-layer-dependency` | FSD レイヤー間の依存方向が正しいか |
| `fsd-openapi-coverage` | OpenAPI 仕様と shared/api/generated の整合性 |

### CI 統合

```yaml
- name: Run guardrails
  run: |
    cd projects/packages/guardrails
    pnpm guardrail
```

---

## 8. CI チェック項目

| ジョブ | 検出する違反 |
|--------|-------------|
| `lint` | レイヤー境界違反、深い import、禁止 import |
| `typecheck` | 型エラー |
| `guardrail` | アーキテクチャ違反（Result、因果メタ、依存方向） |
| `openapi:check` | 生成物未更新 |

### ローカルでの確認

```bash
cd projects
pnpm lint           # ESLint でガードレール違反を検出
pnpm typecheck      # 型チェック
pnpm guardrail      # カスタムガードレール検査
pnpm openapi:check  # 生成物が最新か確認
```

---

## 9. 違反例と正しい例のまとめ

### レイヤー依存違反

```typescript
// ❌ entities から features への依存
// src/entities/user/model/useUser.ts
import { useAuth } from '@/features/auth'; // ERROR: entities は features に依存できません

// ✅ 修正
// 必要なら shared に共通ロジックを移動
```

### 深い import 違反

```typescript
// ❌ スライス内部への直接アクセス
import { loginApi } from '@/features/auth/api/loginApi';

// ✅ 修正: index.ts 経由
import { loginApi } from '@/features/auth';
// + features/auth/index.ts で export
```

### HTTP 直叩き違反

```typescript
// ❌ fetch 直接使用
const response = await fetch('/api/users');

// ✅ 修正: shared/api 経由
import { getUsers } from '@/shared/api';
const users = await getUsers();
```

### OpenAPI 生成忘れ

```bash
# CI で失敗
$ pnpm openapi:check
Error: Generated files are out of date. Run pnpm openapi:generate
```

---

## 10. 設定ファイル一覧

| ファイル | 用途 |
|---------|------|
| `projects/eslint.config.js` | モノレポ共通 ESLint 設定 |
| `projects/apps/web/eslint.config.js` | FSD 用 ESLint 設定 |
| `projects/packages/eslint-config/` | 共通 ESLint 設定パッケージ |
| `projects/packages/guardrails/` | カスタムガードレール（Clean Architecture + FSD） |
| `projects/packages/api-contract/openapi.yaml` | OpenAPI 定義 |
| `projects/packages/api-contract/orval.config.ts` | 生成ツール設定 |

---

## 11. トラブルシューティング

### 「境界違反」エラーが出る

```
Error: 'fsd-features' is not allowed to import 'fsd-widgets'
```

**原因**: 下位レイヤーから上位レイヤーへの依存
**対策**: 共通ロジックを shared に移動するか、設計を見直す

### 「深い import」エラーが出る

```
Error: features スライスは index.ts 経由でのみ import できます
```

**対策**: スライスの `index.ts` で export を追加

### openapi:check が失敗する

```
Error: Generated files are out of date
```

**対策**: `pnpm openapi:generate` を実行して生成物を更新

---

## 関連ドキュメント

- [アーキテクチャ概要](02_architecture/repo_structure.md)
- [Clean Architecture ガードレール](02_architecture/adr/0003_clean_architecture_guardrails.md)
- [API Contract パッケージ](../projects/packages/api-contract/README.md)
