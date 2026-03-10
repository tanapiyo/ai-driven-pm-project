# Skill: Prune Containers

## Trigger
- `/prune-containers` コマンド実行時
- 不要なコンテナを掃除したいとき

## Purpose
削除済み Worktree や マージ済みブランチの Docker コンテナ・ボリューム・ネットワークをクリーンアップする。

## Rules

1. **まず dry-run で確認** - 削除前に必ず対象を確認
2. **main プロジェクトは除外** - メインリポジトリのコンテナは削除しない
3. **ボリュームはデフォルト保持** - `--include-volumes` を明示しない限り残す

## Steps

### Step 1: 削除対象を確認

```bash
./tools/contract prune-containers --dry-run
```

対象:
- **削除済み Worktree のコンテナ**: Worktree が削除されたが Docker リソースが残っているもの
- **マージ済みブランチのコンテナ**: PR がマージされた後も残っているコンテナ

### Step 2: 確認して削除

```bash
# 確認プロンプト付きで削除
./tools/contract prune-containers

# 確認なしで削除（CI向け）
./tools/contract prune-containers --force

# ボリュームも含めて削除
./tools/contract prune-containers --include-volumes
```

### Step 3: 結果を確認

```bash
# 残っているコンテナを確認
docker ps -a --filter "label=com.docker.compose.project"

# 残っているボリュームを確認
docker volume ls
```

## Options

| Option | Description |
|--------|-------------|
| `--dry-run` | 削除せずに対象を表示 |
| `--force` | 確認なしで削除 |
| `--include-volumes` | ボリュームも削除（デフォルトは保持） |
| `-h, --help` | ヘルプ表示 |

## Output
- クリーンアップされたプロジェクト数
- 削除されたコンテナ・ネットワーク・ボリューム一覧

## Related
- `./tools/worktree/cleanup.sh` - Worktree 自体の削除
- `./tools/worktree/remove.sh` - 単一 Worktree の削除
