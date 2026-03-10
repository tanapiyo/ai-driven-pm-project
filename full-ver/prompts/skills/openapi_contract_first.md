# Skill.OpenAPI_Contract_First

HTTP API を設計・実装する際は、必ず OpenAPI 仕様を先に定義する。

---

## Trigger

- HTTP API を設計するとき
- HTTP API を利用/実装するとき
- 外部 API と連携するとき

**重要**: このスキルは実装開始前に実行する（Stage 4: Contract Definition）

---

## Why (なぜ重要か)

1. **契約駆動開発**: フロントエンド/バックエンド間の契約を明確化
2. **ドキュメント自動生成**: 仕様から常に最新のドキュメントを生成
3. **コード生成**: クライアント/サーバースタブを自動生成し、手書きエラーを排除
4. **検証自動化**: リクエスト/レスポンスを仕様に対して自動検証
5. **並行開発**: フロントエンド/バックエンドが同時に開発可能

---

## Steps

### 1. OpenAPI 仕様を作成

```yaml
# docs/02_architecture/api/example-api.yaml
openapi: "3.1.0"
info:
  title: Example API
  version: "1.0.0"
paths:
  /users:
    get:
      summary: List users
      operationId: listUsers
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/User"
components:
  schemas:
    User:
      type: object
      required:
        - id
        - name
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
```

### 2. 仕様をレビュー

確認項目:
- [ ] エンドポイントの命名規則（RESTful）
- [ ] スキーマの完全性（required/optional）
- [ ] エラーレスポンスの定義
- [ ] 認証/認可の記載
- [ ] バージョニング戦略

### 3. コード生成ツールを設定

TypeScript 用の生成ツール:

| 用途 | ツール |
|------|--------|
| Client | `openapi-typescript`, `orval` |
| Server | `express-openapi-validator` |

### 4. 生成コマンドを Contract に追加

```bash
# tools/contract/generate-api
#!/bin/bash
# OpenAPI からコードを生成

npx openapi-typescript docs/02_architecture/api/*.yaml -o projects/packages/api-types/
```

### 5. CI で仕様検証を追加

```yaml
# .github/workflows/api-validation.yaml
- name: Validate OpenAPI spec
  run: npx @stoplight/spectral-cli lint docs/02_architecture/api/*.yaml
```

---

## Guardrails (やってはいけないこと)

1. **手書き HTTP クライアント禁止**
   - ❌ `fetch('/api/users')` を直接書く
   - ✅ 生成されたクライアントを使う

2. **仕様なしの API 変更禁止**
   - ❌ コードを先に変更して後から仕様を更新
   - ✅ 仕様を先に変更してからコード生成

3. **仕様と実装の乖離禁止**
   - CI で仕様と実装の整合性を検証

4. **実装前に OpenAPI 定義必須**
   - ❌ エンドポイント実装後に OpenAPI を書く
   - ✅ OpenAPI → 型生成 → テスト作成 → 実装 の順序を守る

---

## Directory Structure

```
docs/
└── 02_architecture/
    └── api/
        ├── main-api.yaml       # メイン API 仕様
        ├── internal-api.yaml   # 内部 API 仕様
        └── external/           # 外部 API 仕様（参照用）
            └── stripe.yaml

projects/
└── packages/
    └── api-types/              # 生成されたコード
        ├── index.ts
        └── schemas.ts
```

---

## Recommended Tooling

### Linting / Validation

- **Spectral**: OpenAPI lint ルールを適用
- **Redocly CLI**: 仕様の検証とバンドル

### Documentation

- **Redoc**: 静的ドキュメント生成
- **Swagger UI**: インタラクティブドキュメント

### Mock Server

- **Prism**: OpenAPI 仕様からモックサーバーを起動

---

## Output

- `docs/02_architecture/api/*.yaml` - OpenAPI 仕様
- 生成されたクライアント/サーバーコード
- CI での仕様バリデーション設定

---

## Checklist

- [ ] OpenAPI 仕様が `docs/02_architecture/api/` に存在する
- [ ] コード生成コマンドが Contract に追加されている
- [ ] CI で仕様の検証が実行される
- [ ] 手書きの HTTP クライアント/サーバーコードがない
- [ ] API 変更時は仕様が先に更新されている
