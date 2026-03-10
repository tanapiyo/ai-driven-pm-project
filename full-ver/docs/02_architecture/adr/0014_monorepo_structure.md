# ADR-0014: モノレポ構成（pnpm workspace / ディレクトリ設計 / Turborepo 方針）

## ステータス

**Accepted** - 2026-03-03（現状追認）

## 背景

本リポジトリはフロントエンド（React/Next.js）とバックエンド（Hono/Express）を含むフルスタック Web アプリケーションである。複数のアプリケーションと共有パッケージを単一リポジトリで管理するため、モノレポ戦略が必要となった。

当初から以下の要件があった：

- **統一された開発体験**: 単一のリポジトリで全コンポーネントを管理し、CI・ツールチェーンを共有する
- **共有コードの一元管理**: OpenAPI 契約、ESLint 設定、ドメインロジックを複数アプリ間で共有する
- **依存関係の厳格な管理**: phantom dependencies（実際にインストールされていない依存への暗黙的アクセス）を防ぐ
- **エージェントフレンドリー**: AI エージェントが `./tools/contract` 経由でモノレポ全体を操作できる構造

本 ADR は、現在採用しているモノレポ構成の決定事項を正式に記録する。

## 決定事項

### 1. パッケージマネージャ: pnpm@9.15.0

**決定**: `pnpm@9.15.0` を採用する（`projects/package.json` の `packageManager` フィールドで固定）。

**選定理由**:

| 観点 | pnpm | npm workspaces | yarn berry |
|------|------|----------------|------------|
| phantom dependencies 防止 | 厳格（symlink + isolated node_modules） | 防止不可（hoisting） | 防止可能だが設定複雑 |
| ディスク効率 | content-addressable store（重複排除） | 各 workspace に重複インストール | ZipFS（独自形式） |
| インストール速度 | 高速（キャッシュ活用） | 普通 | 高速だが初回ビルド重い |
| 互換性 | Node.js 標準的な `node_modules` 構造 | 標準 | PnP モード時に非標準 |
| 設定の複雑さ | 低（`pnpm-workspace.yaml` のみ） | 低 | 中〜高（`.yarnrc.yml` + プラグイン） |

npm は hoisting による phantom dependencies の問題があり、本番環境でのランタイムエラーを引き起こすリスクがある。yarn berry の PnP（Plug'n'Play）モードは非標準の Module Resolution を使用するため、既存ツールチェーンとの互換性問題が生じやすい。pnpm の isolated `node_modules` 方式は厳格な依存関係管理と高い互換性を両立する。

**ワークスペース設定** (`projects/pnpm-workspace.yaml`):

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

再帰実行には `pnpm -r` を使用（例: `pnpm -r build`, `pnpm -r test`）。特定パッケージへの操作は `pnpm --filter @monorepo/<name>` を使用する。

### 2. ワークスペース構成: `projects/apps/*` と `projects/packages/*`

**決定**: ルート直下ではなく `projects/` 配下にワークスペースをネストする構成を採用する。

```
/                          # リポジトリルート（インフラ・ツール・ドキュメント用）
├── docs/                  # アーキテクチャ記録、API 仕様、プロセスドキュメント
├── tools/                 # contract スクリプト、worktree 管理ツール
├── .claude/               # AI エージェント設定
├── .github/               # CI/CD ワークフロー
└── projects/              # アプリケーションコード境界
    ├── package.json        # pnpm workspace root（packageManager 固定）
    ├── pnpm-workspace.yaml # ワークスペース定義
    ├── apps/
    │   ├── api/            # @monorepo/api — バックエンド（Hono/Express）
    │   └── web/            # @monorepo/web — フロントエンド（React）
    └── packages/
        ├── api-contract/   # @monorepo/api-contract — OpenAPI 契約 + Orval 生成クライアント
        ├── eslint-config/  # @monorepo/eslint-config — 共有 ESLint 設定
        ├── guardrails/     # @monorepo/guardrails — アーキテクチャ境界検証ツール
        └── shared/         # @monorepo/shared — 共有ドメインロジック・ユーティリティ
```

**`projects/` をネストする設計意図**:

- リポジトリルートをアプリケーションコードから分離することで、ドキュメント (`docs/`)・ツール (`tools/`)・エージェント設定 (`.claude/`) の整理が容易になる
- `apps/` はデプロイ可能な単位（本番環境に直接デプロイされる成果物）を、`packages/` は `apps/` から共有されるライブラリを分類する
- このルール（apps = デプロイ単位、packages = 共有ライブラリ）は、新しいサービスを追加する際の判断基準となる

### 3. Turborepo: 現時点では未導入

**決定**: Turborepo は導入しない。pnpm workspace の再帰実行（`pnpm -r`）で十分である。

**未導入の理由**:

| 観点 | 現状評価 |
|------|---------|
| ビルド時間 | パッケージ数が少なく（apps 2, packages 4）、ビルド時間がボトルネックになっていない |
| タスクグラフ | `pnpm -r` による再帰実行で依存関係順ビルドが実現できている |
| キャッシュ必要性 | CI キャッシュは GitHub Actions の標準キャッシュ（`node_modules`, `.pnpm-store`）で対応済み |
| 設定コスト | `turbo.json` の追加と pipeline 定義の学習コストに対して、現時点での費用対効果が低い |

**将来の検討トリガー**:

以下の条件が発生した場合に Turborepo 導入を再検討する：

- アプリケーション数またはパッケージ数が 10 を超え、`pnpm -r build` が 5 分以上かかる
- 変更ファイルに基づく affected build（影響範囲限定ビルド）が必要になる
- リモートキャッシュによる CI 時間の大幅削減が費用対効果的になる

**移行容易性**: 本構成は Turborepo 導入に対してほぼ無修正で対応できる。`turbo.json` の追加と `package.json` の `scripts` の `turbo run` への差し替えで移行可能である。

### 4. 共有パッケージの分割方針

**決定**: 機能的凝集度（functional cohesion）に基づいて共有パッケージを分割する。

| パッケージ | スコープ | 役割 |
|-----------|---------|------|
| `@monorepo/api-contract` | OpenAPI 契約 | `openapi.yaml` を SSOT とし、Orval でフロントエンド向け型付きクライアントを生成する。バックエンド・フロントエンド間の API インターフェース契約を一元管理する |
| `@monorepo/eslint-config` | 静的解析設定 | ESLint ルールセットを共有する。各アプリは `extends` でこの設定を継承し、プロジェクト固有のルールのみ上書きする |
| `@monorepo/guardrails` | アーキテクチャ検証 | Clean Architecture の層依存関係と FSD のスライス依存関係を自動検証する。`eslint-plugin-boundaries` の設定を含む |
| `@monorepo/shared` | 共有ドメインロジック | フロントエンド・バックエンドで共用するユーティリティ、型定義、定数を配置する。特定のフレームワークに依存しない純粋な TypeScript コードのみを含む |

**分割の判断基準**:

- 新しい共有コードを作成する場合、まず `shared` パッケージへの追加を検討する
- 特定のインフラ（OpenAPI、ESLint）に強く結合する場合は専用パッケージとして分離する
- パッケージ間の循環依存を避ける（`shared` は他のパッケージに依存してはならない）

## 結果

### ポジティブ

- **統一されたパッケージ管理**: pnpm の isolated `node_modules` により phantom dependencies が防止され、ビルドの再現性が高まる
- **明確な依存関係**: `apps/` vs `packages/` の分類がコード配置の判断基準を提供する
- **開発体験の統一**: `./tools/contract` 経由で全アプリ・全パッケージの操作が統一される
- **将来の拡張性**: Turborepo 導入や新アプリ追加に対してほぼ無修正で対応できる構造

### ネガティブ

- **pnpm 固有の学習コスト**: npm や yarn に慣れた開発者が pnpm の挙動（symlink, `.pnpm-store`, `overrides` 等）を理解するのに時間がかかる
- **`projects/` のネスト**: ルートに直接 `package.json` がないため、pnpm の実行ディレクトリに注意が必要（`projects/` 配下でコマンドを実行する必要がある）

## 検討した代替案

### npm workspaces

- **却下理由**: hoisting による phantom dependencies の問題が根本的に解決されない。依存関係が暗黙的に解決されるため、本番環境でのランタイムエラーリスクが残る

### yarn berry (Plug'n'Play モード)

- **却下理由**: PnP モードによる非標準の Module Resolution が既存ツール（IDE, Node.js ネイティブモジュール等）との互換性問題を引き起こしやすい。nodeLinker: node-modules モードであれば pnpm と差異が小さくなるが、その場合 yarn berry を選ぶメリットが薄い

### Turborepo（初期から導入）

- **却下理由**: 現時点でビルド速度のボトルネックが存在しない。設定と学習コストに対して費用対効果が低い。パッケージが増加した時点で導入を再検討する

### Nx

- **却下理由**: Turborepo より設定が複雑で、学習コストが高い。プラグインエコシステムへの依存度も高く、フレームワーク固定感が強い。本プロジェクトの規模では過剰

### ルート直下にワークスペースを配置（`projects/` ネストなし）

- **却下理由**: リポジトリルートにアプリケーションコードとインフラ・ツール・ドキュメントが混在し、構造が不明確になる。`docs/`・`tools/`・`.claude/` を同階層に並べる設計意図（関心の分離）を活かせない

## 参照

- [AGENTS.md](../../../AGENTS.md) - リポジトリ契約（canonical）
- [`projects/pnpm-workspace.yaml`](../../../projects/pnpm-workspace.yaml) - ワークスペース定義
- [`projects/package.json`](../../../projects/package.json) - ルートパッケージ設定（`packageManager` フィールド）
- ADR-0001: Contract アーキテクチャ（`./tools/contract` ゴールデンコマンドの定義）
- [pnpm workspaces ドキュメント](https://pnpm.io/workspaces)
- [Turborepo ドキュメント](https://turbo.build/repo/docs)
