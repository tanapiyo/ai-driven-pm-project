---
name: Release PR
about: リリースを行うPR
title: "[Release] vX.Y.Z"
labels: release
---

## Release Plan

### Version
<!-- リリースバージョン -->

`vX.Y.Z`

### Release Date
<!-- リリース予定日 -->

YYYY-MM-DD

---

## Changes Included

### Features
<!-- 含まれる機能 -->

- 

### Bug Fixes
<!-- 含まれるバグ修正 -->

- 

### Breaking Changes
<!-- 破壊的変更がある場合 -->

- 

---

## Pre-Release Checklist

- [ ] すべての AC が満たされている
- [ ] `./tools/contract lint` が通る
- [ ] `./tools/contract test` が通る
- [ ] `./tools/contract build` が通る
- [ ] ドキュメントが更新されている
- [ ] CHANGELOG が更新されている

---

## Deployment

### 手順
<!-- デプロイ手順 -->

1. 
2. 
3. 

### 監視
<!-- 監視項目 -->

- [ ] Error rate
- [ ] Response time
- [ ] 

---

## Rollback

### 手順
<!-- ロールバック手順 -->

1. 
2. 

### トリガー
<!-- ロールバックを判断する条件 -->

- 

---

## Go / No-Go

### Go 条件
- [ ] CI が通っている
- [ ] Staging で動作確認済み
- [ ] Reviewer の approve がある

### No-Go 条件
- [ ] Critical bug が発見された
- [ ] Performance regression がある
