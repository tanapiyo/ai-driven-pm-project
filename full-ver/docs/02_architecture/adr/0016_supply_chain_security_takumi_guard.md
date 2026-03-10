# ADR-0016: サプライチェーンセキュリティ強化（Takumi Guard npm）

## ステータス

Proposed

## 背景

### 現在の CI セキュリティ構成

本プロジェクトの CI (`ci.yml`) は以下の2層のセキュリティゲートで構成されている。

| ゲート | ツール | 検出方式 | 限界 |
|--------|--------|----------|------|
| 秘密情報検出 | gitleaks 8.21.2 | コミット履歴のスキャン | 実行ファイルの悪性コードは対象外 |
| 脆弱性検出 | `pnpm audit --audit-level=high` | NVD/既知CVEデータベース照合 | 公開済み CVE のみ。悪性パッケージは対象外 |

### 解決すべき課題

`pnpm audit` は **CVE として登録済みの脆弱性を事後検出** する。しかし、以下の攻撃ベクタには対応できない。

- **typosquatting**: 正規パッケージに似た名前の悪性パッケージ
  （例: `lodahs`（本来 `lodash`）、`cros-env`（本来 `cross-env`））
- **依存関係混乱攻撃（Dependency Confusion）**: 内部パッケージ名と同名のパブリックパッケージを公開し、
  パッケージマネージャーに意図せずダウンロードさせる手法
- **悪性コード埋め込み**: CVE 未登録のまま悪性コードが含まれるパッケージ

これらは `pnpm install` 実行時にパッケージが取得・インストールされる段階でリアルタイムにブロックする必要があり、
既存の「インストール後の事後検出」では対応が困難である。

### 採用候補

Flatt Security が提供する GitHub Action `flatt-security/setup-takumi-guard-npm` は、
CI の `pnpm install` をセキュリティプロキシ（`npm.flatt.tech`）経由に透過的に変更することで、
既知の悪性パッケージをインストール前にリアルタイムでブロックする。

## 決定内容

### setup-takumi-guard-npm を CI セキュリティゲートに追加する

`ci.yml` の `security-checks` ジョブに `flatt-security/setup-takumi-guard-npm@v1` を組み込み、
pnpm install 実行前に動作させる。

#### 動作機構

```
pnpm install
     |
     v
npm.flatt.tech (セキュリティプロキシ)
     |
     +-- 既知悪性パッケージ? --> インストールをブロック
     |
     +-- 安全なパッケージ --> npmjs.org に転送
```

1. GitHub Action が `.npmrc` を書き換え、レジストリを `https://npm.flatt.tech` に切り替える
2. `pnpm install` 時に全パッケージがプロキシを経由し、既知の悪性パッケージをブロック
3. 安全なパッケージは透過的に npmjs.org から取得される（エンドツーエンド動作は変わらない）

#### pnpm との互換性

互換性検証の結果、pnpm は問題なく動作する。

| 検証項目 | 結果 | 補足 |
|----------|------|------|
| プロキシ経由インストール | 互換 | `.npmrc` の `registry` 設定を書き換えるだけで動作する |
| lockfile の扱い | 要再生成（1回限り） | 既存 lockfile はnpmjs.org参照のため、プロキシ URL に更新が必要 |
| スコープ付きパッケージ | 互換 | 既存のスコープ別レジストリ設定は上書きされない |
| ワークスペース | 互換 | pnpm workspace の構造に影響しない |
| Frozen lockfile (`--frozen-lockfile`) | 互換 | 再生成後は通常通り使用可能 |

**lockfile 再生成の手順（初回のみ）:**

```bash
# DevContainer 内で実行
npm config set registry https://npm.flatt.tech
cd projects
rm pnpm-lock.yaml
pnpm install
git commit -m "chore(deps): regenerate lockfile for takumi-guard proxy"
```

#### Bot ID（Shisho Cloud byGMO）の要否判断

**Bot ID は任意（初期フェーズでは不要）とする。**

| モード | Bot ID | 機能 |
|--------|--------|------|
| Blocking-only | 不要 | 悪性パッケージのブロックのみ。認証不要。設定2行 |
| Full protection | 必要 | ブロック + 監査ログ + Shisho Cloud ダッシュボード |

初期フェーズでは以下の理由から Blocking-only モードを採用する。

- Bot ID 取得には Shisho Cloud byGMO のアカウント作成が必要であり、
  MVP 段階での外部 SaaS への依存増加は避ける
- 認証失敗時にもブロック機能は継続動作するため、可用性リスクはない
- OIDC ベースの認証（`permissions: id-token: write`）は将来いつでも追加可能

**将来移行トリガー（Bot ID 導入判断）:**

- インシデント発生後の監査証跡が必要になった場合
- Shisho Cloud ダッシュボードによる可視化要求が生じた場合
- セキュリティポリシーの変更により監査ログが義務化された場合

#### 実装例

```yaml
# .github/workflows/ci.yml の security-checks ジョブへの追加
- name: Setup Takumi Guard for npm
  uses: flatt-security/setup-takumi-guard-npm@v1
  # Bot ID なし = Blocking-only モード。将来 Full protection に移行する場合は以下を追加:
  # with:
  #   bot-id: ${{ vars.TAKUMI_GUARD_BOT_ID }}
  # permissions:
  #   id-token: write

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

> **Action タグの固定について**: `@v1` はメジャーバージョンタグ参照であり、マイナーアップデートが自動適用される。
> セキュリティ専業ツールの採用目的に照らし、Flatt Security の更新ポリシーを信頼してメジャータグを使用する。
> より厳格な管理が必要になった場合は、SHA ピン（例: `@abc1234`）へ移行する。移行判断は依存更新 ADR で記録する。

#### ロールアウト手順

Takumi Guard 導入は以下の順序で実施する。

1. **lockfile 再生成 PR（先行）**: プロキシ経由で `pnpm-lock.yaml` を再生成し、別 PR でマージする
2. **ci.yml 更新 PR（後続）**: `setup-takumi-guard-npm` ステップを追加する

```bash
# Step 1: lockfile 再生成（DevContainer 内で実行）
npm config set registry https://npm.flatt.tech
cd projects
rm pnpm-lock.yaml
pnpm install   # プロキシ経由で全パッケージを再解決
git add pnpm-lock.yaml
git commit -m "chore(deps): regenerate lockfile for takumi-guard proxy registry"
# → PR を作成してマージ

# Step 2: lockfile マージ完了後、ci.yml に Action を追加する PR を作成
```

**この順序が重要な理由**: lockfile が npmjs.org 参照のまま `--frozen-lockfile` を使うと、
プロキシ URL の変更により不一致が生じ CI が失敗する。lockfile を先にプロキシ経由で再生成することで回避する。

## 結果

### ポジティブな影響

- typosquatting・依存関係混乱攻撃に対する **リアルタイムブロック** を実現する
- `pnpm audit`（CVE 事後検出）と相補的な多層防御体制になる
- 設定変更なし（コードベースへの変更ゼロ）でセキュリティが向上する
- Bot ID なしでも機能するため、外部アカウント登録・シークレット管理が不要
- GitHub OIDC ベースの認証設計により、将来的な監査ログ導入でも秘密情報管理が不要

### ネガティブな影響

- pnpm install が `npm.flatt.tech` プロキシを経由するため、プロキシ障害時に CI が失敗する可能性がある
- lockfile の一回限りの再生成が必要
- `npm.flatt.tech` への外部依存が追加される（Flatt Security のサービス継続性に依存）

### 緩和策

- **プロキシ障害時の挙動**: `npm.flatt.tech` が応答しない場合は CI ジョブ全体が失敗する（Fail-closed）。
  これはセキュリティ優先の設計方針であり、npmjs.org への直接フォールバックは行わない。
  プロキシ側の SLA/インシデント情報は [status.flatt.tech](https://status.flatt.tech) で確認する。
  連続障害の場合は Action ステップを一時コメントアウトし、復旧後に再有効化する運用で対処する。
- **サービス廃止リスク**: Flatt Security は日本のセキュリティ専業企業。
  サービス廃止の場合は `ci.yml` から Action ステップを削除するだけで元の状態に戻せる。
  代替手段として Socket.dev 等が選択肢になる（代替案 B 参照）。
- **lockfile 再生成は初回のみ**: 以降は `--frozen-lockfile` により追加作業不要。

## 検討した代替案

### 代替案 A: Snyk

- **概要**: 依存関係の脆弱性スキャン + マルウェア検出を提供する SaaS。
  GitHub Actions との統合が充実しており、PR ブロックや自動 PR 修正も可能。
- **却下理由**:
  - 有料プラン（Free プランは制限あり）
  - 別途 API キー（シークレット）の管理が必要
  - `pnpm audit` との機能重複が大きく（CVE検出は両方カバー）、追加価値がコスト増に見合わない
  - typosquatting・依存関係混乱攻撃のブロック機能は Snyk の主眼ではない

### 代替案 B: Socket.dev

- **概要**: サプライチェーンセキュリティに特化した SaaS。
  パッケージの行動分析（実行時動作パターン）により未知の悪性コードも検出できる。
  typosquatting・依存関係混乱攻撃への対応が強み。
- **却下理由**:
  - 有料プラン（GitHub App 連携含む）
  - セキュリティ目的のための追加 API キー管理が必要
  - setup-takumi-guard-npm と機能が重複し、コスト対効果で劣る
  - 日本語ドキュメント・サポートが限定的

### 代替案 C: Dependabot（GitHub Advanced Security）

- **概要**: GitHub 標準の依存関係アップデート・脆弱性検出。
  `pnpm audit` と同様に NVD ベースの CVE 検出が中心。
- **却下理由**:
  - Dependabot はバージョンアップ PRの自動作成が主機能。
    インストール時のリアルタイムブロックは対応外
  - typosquatting・依存関係混乱攻撃の検出・ブロックは対応外
  - 既存の `pnpm audit` と機能がほぼ重複

### 代替案 D: pnpm audit の強化のみ（現状維持）

- **概要**: 追加ツールを導入せず、`--audit-level` を `moderate` 以上に引き下げる等で
  既存の脆弱性チェックを強化する対応のみに留める。
- **却下理由**:
  - `pnpm audit` は CVE 登録済みパッケージの事後検出に限定される
  - typosquatting・依存関係混乱攻撃は CVE として登録されないケースが多く、根本解決にならない

## 参照

- Issue: #69
- [flatt-security/setup-takumi-guard-npm](https://github.com/flatt-security/setup-takumi-guard-npm) — GitHub Action
- `.github/workflows/ci.yml` — 現在の CI パイプライン
- [Shisho Cloud byGMO](https://shisho.dev/) — Bot ID 発行元（Full protection 移行時に必要）
- `docs/02_architecture/adr/0004_jwt_authentication.md` — 認証関連 ADR
