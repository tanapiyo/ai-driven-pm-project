# ADR-0002: Docker Compose による apps 一括起動とデバッグ環境

- **Status**: Proposed
- **Created**: 2026-01-15
- **Author**: AI Agent

---

## Context

### 課題

- `projects/apps/` 配下に複数のアプリケーションが存在する場合、それぞれを個別に起動・管理するのは煩雑
- 開発時のデバッグ環境が統一されていない
- マイクロサービス構成やモノレポでは、依存関係のあるサービスを同時起動する必要がある

### 現状

- DevContainer はベース環境のみを提供
- `./tools/contract dev` コマンドは未実装
- apps 内のアプリケーションは個別の `dev` スクリプトのみ

---

## Decision

### docker-compose.yaml による一括起動

1. **スタック適用時に `docker-compose.yaml` を生成**
   - `projects/docker-compose.yaml` に配置
   - apps 配下の各アプリケーションをサービスとして定義

2. **VS Code デバッグ設定の自動生成**
   - `.vscode/launch.json` にデバッグ設定を追加
   - アタッチモードでデバッグ可能

3. **contract コマンドの追加**
   - `./tools/contract dev` で docker-compose up を実行
   - `./tools/contract dev:stop` で停止

### ディレクトリ構造

```
projects/
├── docker-compose.yaml       # 一括起動設定
├── docker-compose.override.yaml  # ローカルオーバーライド（gitignore）
├── apps/
│   ├── api/
│   │   └── Dockerfile.dev    # 開発用 Dockerfile
│   └── web/
│       └── Dockerfile.dev
└── packages/
```

### スタック別設定

| Stack ID | 対応サービス | デバッグポート |
|----------|-------------|---------------|
| node-ts_pnpm | Node.js (tsx watch) | 9229 |
| python_ruff_pytest | Python (debugpy) | 5678 |
| gas_clasp | N/A（ローカル起動なし） | - |

---

## Alternatives Considered

### 1. VS Code Tasks のみで管理

- **Pros**: シンプル、docker 不要
- **Cons**: 依存サービスの起動順序管理が困難、環境差異が発生

### 2. DevContainer に全て含める

- **Pros**: 1コンテナで完結
- **Cons**: コンテナ再構築が重い、分離度が低い

### 3. Tilt / Skaffold 導入

- **Pros**: Kubernetes ネイティブ
- **Cons**: 学習コストが高い、ローカル開発には過剰

---

## Consequences

### Positive

- 統一された起動コマンド（`./tools/contract dev`）
- サービス間の依存関係を docker-compose で管理
- デバッグ設定の自動化

### Negative

- Docker の知識が必要
- ディスク容量を消費
- gas_clasp スタックでは使用しない

### Risks

- Docker Compose V2 (docker compose) と V1 (docker-compose) の差異
  - 対策: V2 を前提とし、ドキュメントに明記

---

## Implementation Plan

1. **Stack scaffold に Dockerfile.dev テンプレートを追加**
2. **docker-compose.yaml テンプレートを追加**
3. **contract dev / dev:stop コマンドを実装**
4. **.vscode/launch.json テンプレートを追加**
5. **apply_stack.sh を更新**

---

## References

- [Docker Compose specification](https://docs.docker.com/compose/compose-file/)
- [VS Code Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [ADR-0001](0001_contract_architecture.md)
