# Issue Label Rules (Always Applied)

## Required Label Groups (MUST)

Every Issue **MUST** have exactly one label from each of the 3 required groups:

| Group | Rule | Examples |
|-------|------|---------|
| `type:*` | Exactly 1, exclusive | `type:feature`, `type:bug`, `type:architect`, `type:improvement`, `type:chore`, `type:doc`, `type:spike`, `type:epic` |
| `role:*` | Exactly 1, exclusive | `role:designer`, `role:frontend`, `role:backend`, `role:infra`, `role:ops` |
| `priority:*` | Exactly 1, exclusive | `priority:must`, `priority:nice`, `priority:medium`, `priority:low` |

## Label Checklist (MUST verify before creating/updating Issues)

```
- [ ] type:* が 1 つだけ付いている
- [ ] role:*  が 1 つだけ付いている
- [ ] priority:* が 1 つだけ付いている
- [ ] status:* は必要な場合のみ（排他的に 1 つ）
- [ ] .github/labels.yml の定義と一致している
```

## SSOT

**`.github/labels.yml` はラベル定義の唯一の正規情報源（SSOT）。**
ラベル名・色・説明の追加/変更/削除は必ず `.github/labels.yml` を先に更新する。

```bash
# 利用可能なラベルを確認する
cat .github/labels.yml | grep "^- name:"
```

## MUST NOT

| MUST NOT | Why |
|----------|-----|
| `needs-triage` ラベルを使う | 廃止済み。priority:* グループがトリアージの意図を担う |
| 旧ラベル（`bug`, `enhancement`, `task`, `epic`, `documentation` 等）を使う | prefix 付き（`type:*`）に統合済み |
| 3 グループのいずれかを省略する | フィルタリング・自動化が機能しなくなる |
| `.github/labels.yml` を参照せずにラベルを付与する | 定義とのドリフトを招く |

## Milestone Assignment (RECOMMENDED)

Issue にはマイルストーンを付与することを推奨する（必須ではない）:

- バージョンリリース: `vX.Y - 概要`（例: `v1.0 - MVP リリース`）
- スプリント: `Sprint N`（例: `Sprint 1`）

詳細は `docs/00_process/project_management.md` を参照。

## Detailed Reference

→ `.github/labels.yml` (SSOT: ラベル定義)
→ `docs/00_process/issue-operation-rules.md` (運用ルール詳細)
→ `.claude/skills/issue-creation/SKILL.md` (Issue 作成ワークフロー)
