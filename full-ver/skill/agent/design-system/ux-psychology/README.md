# UX Psychology Pack

UX心理学の概念をプロダクト設計・AC定義・PRレビュー・学習サイクルに統合するためのパック。

## Overview

[ShokaSonjuku UX Psychology](https://www.shokasonjuku.com/ux-psychology) を一次情報源として、UX心理学の概念をローカルに保持し、設計判断の根拠として活用する。

## Directory Structure

```
ux-psychology/
├── README.md              # このファイル
├── scripts/               # クローラー・カタログビルダー
│   ├── crawl_shokasonjuku_ux_psychology.py
│   └── build_catalog.py
├── templates/             # 設計・レビュー用テンプレート
│   ├── ux-psychology-impact-assessment.md
│   ├── ux-psychology-pr-checklist.md
│   └── ux-psychology-acceptance-criteria.md
├── docs/                  # 運用ドキュメント
│   ├── process.md         # 設計→AC→レビュー→学習プロセス
│   └── governance.md      # 責任分界・更新頻度
├── ci/                    # ローカル整合性チェッカー
│   └── check_pack_integrity.py
├── prompts/               # AI向けプロンプト
│   ├── design.md          # 設計フェーズ用
│   ├── review.md          # レビューフェーズ用
│   └── onboarding.md      # 導入ガイド用
├── sources/               # クロール結果（raw/text/meta）
│   └── .gitkeep
└── rules/                 # catalog.json 格納先
    └── .gitkeep
```

## Quick Start (DevContainer)

すべてのスクリプトは DevContainer 内で実行する。

### 1. 環境準備

```bash
# DevContainer を起動（worktree が必要）
./tools/contract up

# DevContainer 内で venv を作成し、依存パッケージをインストール
docker exec <container-name> bash -c "
  python3 -m venv /tmp/ux-crawl-venv &&
  /tmp/ux-crawl-venv/bin/pip install requests beautifulsoup4
"
```

### 2. ソースのクロール

```bash
# robots.txt を確認（クロール前に必ず実行）
docker exec <container-name> /tmp/ux-crawl-venv/bin/python \
  /workspace/skill/agent/design-system/ux-psychology/scripts/crawl_shokasonjuku_ux_psychology.py \
  --check-robots

# クロール実行（sources/ にデータを保存）
docker exec <container-name> /tmp/ux-crawl-venv/bin/python \
  /workspace/skill/agent/design-system/ux-psychology/scripts/crawl_shokasonjuku_ux_psychology.py
```

### 3. カタログの生成

```bash
# catalog.json を生成
docker exec <container-name> python3 \
  /workspace/skill/agent/design-system/ux-psychology/scripts/build_catalog.py
```

### 4. 整合性チェック

```bash
# catalog.json と sources の整合性を検証
docker exec <container-name> python3 \
  /workspace/skill/agent/design-system/ux-psychology/ci/check_pack_integrity.py --verbose
```

> **Note**: `<container-name>` は `feat-<issue>-<slug>-dev` 形式（例: `feat-501-ux-psychology-pack-dev`）。
> `build_catalog.py` と `check_pack_integrity.py` は標準ライブラリのみで動作するため venv 不要。

### ローカル hook での整合性チェック（任意）

PR 前にローカルで整合性を確認するには：

```bash
# 手動実行
docker exec <container-name> python3 \
  /workspace/skill/agent/design-system/ux-psychology/ci/check_pack_integrity.py

# または、ホスト側に Python 3.9+ があれば直接実行も可
python3 skill/agent/design-system/ux-psychology/ci/check_pack_integrity.py
```

整合性チェックは CI には組み込まず、ローカル開発フローで活用する。

## Usage in Development Workflow

1. **設計フェーズ**: `templates/ux-psychology-impact-assessment.md` を使って適用する概念を選定
2. **AC定義**: `templates/ux-psychology-acceptance-criteria.md` で心理学観点の AC を追加
3. **PRレビュー**: `templates/ux-psychology-pr-checklist.md` でレビュー時にチェック
4. **学習**: `docs/process.md` に沿って振り返りを実施

詳細は `docs/process.md` を参照。

## Legal & Ethical Notice

### robots.txt / Terms of Use

- ソースサイト (shokasonjuku.com) の `robots.txt` は取得時点で 404（明示的な禁止なし）
- ただし、クロール実行前に必ず最新の `robots.txt` と利用規約を再確認すること
- 大量アクセスを避けるため、クローラーにはリクエスト間隔（デフォルト 2秒）を設定済み
- 取得コンテンツは**社内の設計判断参照用途のみ**に使用し、再配布しないこと
- ライセンス上の問題が判明した場合は、即座に `sources/` を削除し `catalog.json` を空にすること

### Dark Pattern Prevention

**このパックの概念は、ユーザーの利益のために使用すること。**

以下の行為は禁止：

| 禁止事項 | 例 |
|----------|-----|
| 意図的な誤解誘導 | フレーミング効果でユーザーに不利な選択を誘導 |
| 強制的な希少性演出 | 虚偽の「残りわずか」表示 |
| 隠れたコスト | サンクコスト効果を悪用した解約困難化 |
| 強制的ゲーミフィケーション | 依存を目的としたポイント設計 |
| 偽の社会的証明 | 架空のレビューや推薦 |

設計時には必ず以下を自問すること：

1. この施策はユーザーの目的達成を支援しているか？
2. ユーザーが十分な情報のもと自由に選択できるか？
3. 施策を取り除いてもユーザー体験が成立するか？

上記 3 つすべてに Yes と言えない場合、ダークパターンの可能性がある。

## Maintenance

- **月次**: ソースの更新チェック（`scripts/crawl_shokasonjuku_ux_psychology.py` 再実行）
- **四半期**: テンプレートの有効性レビュー
- 詳細は `docs/governance.md` を参照
