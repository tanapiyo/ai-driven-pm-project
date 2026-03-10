# Release Process

## Principles

1. **小さく出す** - スコープを削るのが正義
2. **main は常にグリーン** - CI が通らない状態で merge しない
3. **ロールバック可能** - 常に戻せる状態を維持

---

## Release Checklist

### Pre-Release

- [ ] すべての AC が満たされている
- [ ] `./tools/contract lint` が通る
- [ ] `./tools/contract test` が通る
- [ ] `./tools/contract build` が通る
- [ ] ドキュメントが更新されている
- [ ] リリースノートが準備されている

### Release

- [ ] PR が approve されている
- [ ] CI が通っている
- [ ] main に merge
- [ ] タグを打つ（必要に応じて）
- [ ] デプロイ実行

### Post-Release

- [ ] 動作確認（Smoke Test）
- [ ] 監視ダッシュボード確認
- [ ] 問題があればロールバック

---

## Rollback Procedure

1. 問題を検知したら即座に判断
2. 前のバージョンにロールバック
3. 原因調査は別途実施（ロールバック優先）
4. Incident Report を作成

---

## Versioning

[Semantic Versioning](https://semver.org/) を採用:

- `MAJOR.MINOR.PATCH`
- MAJOR: 破壊的変更
- MINOR: 後方互換の機能追加
- PATCH: 後方互換のバグ修正

---

## Release Notes Template

```markdown
## [x.y.z] - YYYY-MM-DD

### Added
- 新機能の説明

### Changed
- 変更点の説明

### Fixed
- 修正したバグの説明

### Security
- セキュリティ関連の修正
```
