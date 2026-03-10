# Takumi Guard npm 運用ガイド

サプライチェーンセキュリティツール「Takumi Guard npm」の概要・CI での動作フロー・
パッケージブロック時の対処法・トラブルシューティングを説明します。

---

## 目次

1. [概要](#1-概要)
2. [CI での動作フロー](#2-ci-での動作フロー)
3. [パッケージブロック発生時の対処法](#3-パッケージブロック発生時の対処法)
4. [トラブルシューティング](#4-トラブルシューティング)
5. [Bot ID 導入時のダッシュボード確認方法（将来参照用）](#5-bot-id-導入時のダッシュボード確認方法将来参照用)
6. [関連ドキュメント](#6-関連ドキュメント)

---

## 1. 概要

### Takumi Guard npm とは

Takumi Guard npm（`flatt-security/setup-takumi-guard-npm`）は、
Flatt Security が提供する GitHub Action です。
`pnpm install` 実行時にパッケージをセキュリティプロキシ経由でダウンロードすることで、
以下の脅威をインストール前にリアルタイムでブロックします。

| 脅威の種類 | 説明 |
|-----------|------|
| typosquatting | 正規パッケージに酷似した名前の悪性パッケージ（例: `lodahs` vs `lodash`） |
| 依存関係混乱攻撃 | 内部パッケージ名と同名のパブリックパッケージを公開し意図せずインストールさせる攻撃 |
| 悪性コード埋め込み | CVE 未登録のまま悪性コードが含まれるパッケージ |

### 既存セキュリティゲートとの補完関係

本プロジェクトは多層防御を採用しています。

| ゲート | ツール | 検出方式 | 対象 |
|--------|--------|----------|------|
| 秘密情報検出 | gitleaks | コミット履歴スキャン | ハードコードされたシークレット |
| 脆弱性検出 | `pnpm audit` | CVE データベース照合 | 公開済み CVE |
| **悪性パッケージブロック** | **Takumi Guard npm** | **リアルタイムプロキシ検査** | **typosquatting・未登録悪性パッケージ** |

`pnpm audit` は CVE 登録済みの脆弱性を事後検出しますが、
Takumi Guard npm は **インストール前にリアルタイムでブロック** します。両者は相補的に機能します。

### 動作モード

| モード | Bot ID | 機能 |
|--------|--------|------|
| Blocking-only（現在採用） | 不要 | 悪性パッケージのブロックのみ。認証不要 |
| Full protection（将来移行） | 必要 | ブロック + 監査ログ + Shisho Cloud ダッシュボード |

現在は **Blocking-only モード** を採用しています。
Bot ID 取得・Full protection への移行については [セクション 5](#5-bot-id-導入時のダッシュボード確認方法将来参照用) を参照してください。

---

## 2. CI での動作フロー

### プロキシ経由インストールの仕組み

```
pnpm install
     |
     v
npm.flatt.tech (Takumi Guard セキュリティプロキシ)
     |
     +-- 既知の悪性パッケージ? ──→ インストールをブロック（CI 失敗）
     |
     +-- 安全なパッケージ ────────→ npmjs.org に透過転送
```

1. GitHub Action が `.npmrc` を書き換え、レジストリを `https://npm.flatt.tech` に切り替える
2. `pnpm install` 実行時にすべてのパッケージがプロキシを経由する
3. 安全なパッケージは透過的に npmjs.org から取得される（通常の動作と変わらない）
4. 悪性パッケージが検出された場合はインストールをブロックし、CI ジョブが失敗する

### CI 内での配置

`security-checks` ジョブをはじめ、複数のジョブで `pnpm install` の直前に配置されています。

```yaml
# .github/workflows/ci.yml（抜粋）
- name: Setup Takumi Guard npm
  uses: flatt-security/setup-takumi-guard-npm@v1

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

Takumi Guard npm が設定された後に `pnpm install` が実行されるため、
すべての依存パッケージがプロキシ検査を通過します。

### Fail-closed の設計方針

`npm.flatt.tech` プロキシが応答しない場合（障害・ネットワーク問題等）、
CI ジョブ全体が失敗します（Fail-closed 設計）。
npmjs.org への直接フォールバックは行いません。これはセキュリティ優先の設計です。

プロキシのステータスは [status.flatt.tech](https://status.flatt.tech) で確認できます。

---

## 3. パッケージブロック発生時の対処法

### ブロック発生の確認方法

CI ログで `pnpm install` が失敗している場合、以下のいずれかが原因である可能性があります。

1. **Takumi Guard によるブロック**: 悪性パッケージと判定された
2. **プロキシ障害**: `npm.flatt.tech` が応答していない
3. **lockfile 不整合**: lockfile が古いプロキシ URL を参照している

CI ログのエラーメッセージを確認してください。
Takumi Guard によるブロックの場合、パッケージ名とブロック理由が表示されます。

### Step 1: 本当に悪性パッケージかを確認する

ブロックされたパッケージが実際に悪性かどうかを確認します。

```bash
# パッケージが正規のものか確認する（パッケージ名・公開者・ダウンロード数等）
# https://www.npmjs.com/package/<パッケージ名>

# 依存関係ツリーでどこから参照されているか確認する
cd projects
pnpm why <パッケージ名>
```

**確認ポイント:**

- パッケージ名がよく使われる正規パッケージと似ていないか（typosquatting の疑い）
- 公開日が非常に新しく、ダウンロード数が極端に少なくないか
- README が空または不審な内容でないか

### Step 2: 誤検知（False Positive）の場合

正当なパッケージが誤ってブロックされていると判断した場合の対処法を記載します。

#### 選択肢 A: Flatt Security に報告する

正規パッケージが誤検知された場合は、Flatt Security に報告してください。
誤検知が確認され次第、プロキシのブロックリストから除外されます。

問い合わせ先: [Flatt Security サポートページ](https://flatt.tech/)

#### 選択肢 B: 代替パッケージを検討する

ブロックされたパッケージを別の同等パッケージに置き換えます。

```bash
# 代替パッケージを検索する
# https://www.npmjs.com/ で同等機能のパッケージを探す

# 代替パッケージに差し替える（DevContainer 内で実行）
cd projects
pnpm remove <ブロックされたパッケージ>
pnpm add <代替パッケージ>
```

#### 選択肢 C: プロキシ障害時の一時対応

継続的なプロキシ障害（[status.flatt.tech](https://status.flatt.tech) で確認）の場合のみ、
Action ステップを一時的にコメントアウトして CI を通過させることができます。

**注意**: このコメントアウトは必ず Issue でトラッキングし、
プロキシ復旧後に速やかに再有効化してください。

```yaml
# .github/workflows/ci.yml（一時的なコメントアウト — 障害時のみ）
# - name: Setup Takumi Guard npm
#   uses: flatt-security/setup-takumi-guard-npm@v1
#   # TODO: re-enable after npm.flatt.tech proxy recovery — see #<issue番号>
```

### Step 3: 本当に悪性パッケージの場合

ブロックされたパッケージが実際に悪性であると判断した場合の対処法です。

1. **依存関係を調査する**: どのパッケージが悪性パッケージを依存関係として持っているかを特定する

```bash
cd projects
pnpm why <悪性パッケージ名>
```

2. **依存元パッケージを更新する**: 悪性パッケージを依存している上位パッケージの新バージョンを確認する

```bash
# 依存元パッケージが更新されているか確認する
pnpm outdated
```

3. **依存元パッケージを削除・代替する**: 更新版が存在しない場合は、別の代替パッケージへの移行を検討する

4. **セキュリティインシデントとして記録する**: Slack のセキュリティチャンネル等に報告し、
   影響範囲の調査を行ってください

---

## 4. トラブルシューティング

### CI 失敗時の切り分け手順

```
1. ログを確認する
   └─ pnpm install のエラーメッセージを確認する

2. エラーの種類を特定する
   ├─ "blocked by Takumi Guard" 系のメッセージ
   │   └─ → セクション 3 の対処法を参照する
   ├─ "ECONNREFUSED" / "network error" 系のメッセージ
   │   └─ → プロキシ障害の可能性。status.flatt.tech を確認する
   ├─ "ERR_PNPM_FROZEN_LOCKFILE" 系のメッセージ
   │   └─ → lockfile 不整合。下記「lockfile 不整合」を参照する
   └─ OIDC 関連エラー
       └─ → 下記「OIDC エラー」を参照する
```

### lockfile 不整合

**症状:** `ERR_PNPM_FROZEN_LOCKFILE` または lockfile に関するエラーが出る

**原因:** `pnpm-lock.yaml` が Takumi Guard プロキシ（`npm.flatt.tech`）経由で生成されていない場合、
`--frozen-lockfile` でのインストール時にプロキシ URL の不一致が生じる可能性があります。

**対処:**

```bash
# DevContainer 内で実行する
npm config set registry https://npm.flatt.tech
cd projects
rm pnpm-lock.yaml
pnpm install   # プロキシ経由で全パッケージを再解決する
git add pnpm-lock.yaml
git commit -m "chore(deps): regenerate lockfile for takumi-guard proxy registry"
```

**注意:** lockfile の再生成は初回のみ必要です。
以降は `--frozen-lockfile` で問題なく動作します。

### OIDC エラー（Full protection モードでの将来参照用）

**症状:** `OIDC not available` や token exchange 失敗のエラーが出る

**原因:** Full protection モード（Bot ID 使用）では、OIDC トークンを使って認証します。
`id-token: write` 権限が CI ジョブに付与されていない場合に発生します。

**対処:** `.github/workflows/ci.yml` のジョブに以下の権限を追加します。

```yaml
permissions:
  id-token: write
  contents: read
```

**補足:** Blocking-only モード（現在の設定）では OIDC は不要です。
認証に失敗した場合でも、ブロック機能は継続して動作します（フォールバック動作）。

### プロキシ障害（npm.flatt.tech が応答しない）

**症状:** `pnpm install` でネットワークエラーが発生し、CI が失敗する

**確認:**

```
1. https://status.flatt.tech でプロキシのステータスを確認する
2. 障害中であれば復旧を待つ
3. 連続して障害が続く場合のみ、セクション 3 の「選択肢 C」を参照する
```

**補足:** Fail-closed 設計により、プロキシが応答しない場合は CI が失敗します。
これは意図的な動作です（npmjs.org への自動フォールバックは行いません）。

### Action のバージョン確認

**現在の設定:** `flatt-security/setup-takumi-guard-npm@v1`

`@v1` はメジャーバージョンタグ参照です。マイナーアップデートが自動適用されます。
これはセキュリティ専業ツールとして Flatt Security の更新ポリシーを信頼した設計です。

より厳格な管理が必要な場合（特定のコミット SHA にピンする）は、
ADR を作成したうえで `@abc1234` 形式の SHA ピンへ移行してください。

---

## 5. Bot ID 導入時のダッシュボード確認方法（将来参照用）

このセクションは、将来 Full protection モードへ移行した場合の参照用です。
**現在（Blocking-only モード）では Bot ID は不要です。**

### Bot ID とは

Bot ID は Shisho Cloud byGMO（[shisho.dev](https://shisho.dev/)）のアカウントから発行される
パブリックな参照キーです。秘密情報ではないため、GitHub Secrets に保存する必要はありません。

Bot ID を使用すると以下の機能が有効になります。

| 機能 | 詳細 |
|------|------|
| 監査ログ | どのパッケージがどのジョブでインストールされたかを記録する |
| ダッシュボード | Shisho Cloud のダッシュボードでブロック履歴・インストール履歴を確認できる |
| OIDC 認証 | GitHub 組み込みの OIDC を使用。PAT やローテーションが不要 |

### Bot ID の取得手順

1. [Shisho Cloud byGMO](https://shisho.dev/) でアカウントを作成する
2. プロジェクトを作成し、Bot ID を発行する
3. GitHub リポジトリの Variables（Secrets ではない）に登録する
   - Settings > Secrets and variables > Actions > Variables
   - 変数名: `TAKUMI_GUARD_BOT_ID`

### CI 設定の変更手順

Bot ID 導入時は、以下の変更を CI に加えます。

```yaml
# .github/workflows/ci.yml の対象ジョブに権限を追加する
permissions:
  id-token: write   # OIDC トークン発行のために必要
  contents: read

# セットアップ Action に Bot ID を渡す
- name: Setup Takumi Guard npm
  uses: flatt-security/setup-takumi-guard-npm@v1
  with:
    bot-id: ${{ vars.TAKUMI_GUARD_BOT_ID }}
```

### ダッシュボードで確認できる情報

Shisho Cloud ダッシュボードでは以下の情報を確認できます。

| 情報 | 説明 |
|------|------|
| インストール履歴 | いつ・どのジョブで・どのパッケージがインストールされたか |
| ブロック履歴 | ブロックされたパッケージとブロック理由 |
| パッケージリスト | プロジェクトで使用しているパッケージの一覧 |

### Bot ID 導入のトリガー

以下の状況になった場合に Full protection モードへの移行を検討します。

- インシデント発生後の監査証跡が必要になった
- Shisho Cloud ダッシュボードによる可視化要求が生じた
- セキュリティポリシーの変更により監査ログが義務化された

移行時は ADR（Architecture Decision Record）を作成し、決定内容を記録してください。

---

## 6. 関連ドキュメント

- [ADR-0016: サプライチェーンセキュリティ強化（Takumi Guard npm）](../02_architecture/adr/0016_supply_chain_security_takumi_guard.md)
  - 採用決定の背景・設計根拠・代替案の比較
- [verification_runbook.md](verification_runbook.md) - 検証手順書
- [.github/workflows/ci.yml](../../.github/workflows/ci.yml) - CI パイプライン定義
- [flatt-security/setup-takumi-guard-npm](https://github.com/flatt-security/setup-takumi-guard-npm) - GitHub Action
- [Shisho Cloud byGMO](https://shisho.dev/) - Bot ID 発行元（Full protection 移行時に必要）
- [status.flatt.tech](https://status.flatt.tech) - プロキシのステータスページ
- [AGENTS.md](../../AGENTS.md) - Canonical Instructions
