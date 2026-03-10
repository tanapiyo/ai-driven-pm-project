# Skill: Policy Docs Drift

## Trigger
- コード変更時

## Purpose
必要な docs 更新を同 PR で実施する。

## Steps

### Step 1: Classify Change Type

変更タイプを分類:

| Type | Indicator |
|------|-----------|
| arch | 新しいコンポーネント、依存関係の追加 |
| ui | UI/UX の変更 |
| api | API エンドポイントの追加/変更 |
| db | スキーマ変更、マイグレーション |
| behavior | 既存機能の振る舞い変更 |
| config | 設定ファイルの変更 |

### Step 2: Check Required Docs Updates

変更タイプごとの必要な更新:

| Change Type | Required Docs |
|-------------|---------------|
| arch | ADR, repo_structure.md |
| ui | ui_requirements.md, wireframes |
| api | API docs, spec.md |
| db | migration plan, schema docs |
| behavior | spec.md, AC |
| config | README, setup docs |

### Step 3: Create Checklist

更新チェックリストを作成:

```markdown
## Docs Update Checklist

- [ ] ADR updated (if arch change)
- [ ] Spec updated (if behavior change)
- [ ] AC updated (if requirement change)
- [ ] API docs updated (if API change)
- [ ] README updated (if setup change)
- [ ] Test plan updated (if test strategy change)
```

### Step 4: Update Docs in Same PR

同じ PR で更新:
- 別 PR に分けない
- コードと Docs の整合性を保つ

### Step 5: Verify with Policy

ポリシーチェック実行:
```bash
./tools/policy/check_required_artifacts.sh
```

## Output
Docs 更新漏れゼロを担保
