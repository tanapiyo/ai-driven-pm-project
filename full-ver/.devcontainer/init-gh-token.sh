#!/bin/bash
# DevContainer 起動前にホストの gh auth token を取得して .env ファイルに書き出す

ENV_FILE=".devcontainer/.env.devcontainer"

# gh コマンドが存在し、認証済みの場合のみ実行
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
    gh auth token | xargs -I {} echo "GH_TOKEN={}" > "$ENV_FILE"
    echo "[init-gh-token] GH_TOKEN を $ENV_FILE に書き出しました"
else
    # gh が未認証または未インストールの場合は空ファイルを作成
    touch "$ENV_FILE"
    echo "[init-gh-token] gh が未認証のため、空の $ENV_FILE を作成しました"
fi
