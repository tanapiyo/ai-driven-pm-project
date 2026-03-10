# ADR-0001: Contract アーキテクチャ

## Status

**Accepted** - 2026-01-15

## Context

Node.js + TypeScript + React に特化したテンプレートリポジトリを構築するにあたり、以下の課題がある：

1. **コマンドの統一**: lint, test, build などの開発コマンドを統一したインターフェースで提供したい
2. **CI との一貫性**: ローカル開発と CI で同じコマンドを使いたい
3. **エージェントフレンドリー**: AI エージェントが迷わずにコマンドを実行できるようにしたい

## Decision

### Contract パターンの採用

すべての開発コマンドを `tools/contract` 経由で実行する統一インターフェースを定義する。

```bash
./tools/contract format   # フォーマット
./tools/contract lint     # 静的解析
./tools/contract test     # ユニットテスト
./tools/contract build    # ビルド
./tools/contract guardrail # アーキテクチャガードレール
```

### ディレクトリ構成

```
tools/
└── contract/
    ├── contract           # エントリポイント
    └── stack/             # 各コマンドの実装
        ├── format
        ├── lint
        ├── test
        ├── build
        └── ...
```

### 技術スタック

このリポジトリは以下に特化：

- **Runtime**: Node.js
- **Language**: TypeScript
- **Package Manager**: pnpm (workspace)
- **Backend**: Hono
- **Frontend**: React

## Consequences

### Positive

- **統一されたインターフェース**: 同じコマンドで全ての操作が可能
- **CI の簡素化**: Contract 経由なので CI 設定は共通化可能
- **エージェントフレンドリー**: AI エージェントが AGENTS.md を読むだけでコマンドを把握できる
- **シンプルさ**: マルチスタック対応の複雑さを排除

### Negative

- **間接層の追加**: 直接 pnpm コマンドを叩くより1層多い
- **スタック固定**: 他言語への対応は別リポジトリが必要

### Mitigations

- Contract スクリプトは薄いラッパーに留め、オーバーヘッドを最小化
- AGENTS.md に全てのコマンドを文書化

## Alternatives Considered

### 1. 直接 pnpm コマンドを使用
- 却下理由: CI とローカルで差異が生まれやすい、エージェントが混乱しやすい

### 2. Makefile による統一
- 却下理由: pnpm scripts と二重管理になる

### 3. マルチスタック対応
- 却下理由: 複雑さが増し、保守コストが高い。特定スタックに特化した方が品質を高められる

## References

- [AGENTS.md](../../../AGENTS.md) - Canonical Instructions
- [docs/02_architecture/repo_structure.md](../repo_structure.md) - Repository Structure
