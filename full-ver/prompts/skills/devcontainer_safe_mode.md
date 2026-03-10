# Skill: DevContainer Safe Mode

## Trigger
- DevContainer/firewall の問題
- `dangerously-skip-permissions` のリクエスト

## Purpose
安全な範囲で復旧し、記録を残す。

## Risk Profile

このリポジトリは `safe` モードで運用:

| Setting | Value |
|---------|-------|
| risk_profile | safe |
| dangerously_skip_permissions | false |

## Steps

### Step 1: Check Firewall Allowlist

allowlist を確認:
```bash
cat docs/devcontainer.md
```

許可されているドメイン/エンドポイントを確認。

### Step 2: Run Doctor Command

原因切り分け:
```bash
# DevContainer の状態確認
cat /etc/os-release
cat .devcontainer/devcontainer.json
```

### Step 3: Classify Issue

問題を分類:

| Category | Examples |
|----------|----------|
| Network | firewall, proxy, DNS |
| Permission | file access, docker socket |
| Config | devcontainer.json, features |
| Extension | VS Code extension issues |

### Step 4: Safe Recovery

安全な範囲で復旧:

```markdown
## Safe Actions (承認不要)
- allowlist への追加リクエスト
- 設定ファイルの修正
- ログの収集

## Dangerous Actions (承認必要)
- firewall の無効化
- permission の強制スキップ
- セキュリティ設定の変更
```

### Step 5: Record Issue

問題を記録:

```markdown
# DevContainer Issue: [Date]

## Symptom
[発生した問題]

## Root Cause
[推定される原因]

## Resolution
[解決方法]

## Prevention
[再発防止策]
```

場所: `docs/devcontainer.md` または Issue

## Balanced Mode への切り替え

balanced へ切替が必要な場合:

1. 理由を明確に文書化
2. セキュリティ影響を評価
3. 承認を取得
4. 変更を記録

```markdown
## Reason for Balanced Mode

**Why**: [なぜ balanced が必要か]
**Impact**: [セキュリティへの影響]
**Mitigation**: [リスク軽減策]
**Approved by**: [承認者]
```

## Output
- 安全な範囲での復旧手順
- 記録（なぜ問題が起きたか）
