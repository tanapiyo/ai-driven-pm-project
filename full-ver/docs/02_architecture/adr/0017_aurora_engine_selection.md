# ADR-0017: Aurora エンジン選定（PostgreSQL 互換 vs MySQL 互換）

## ステータス

Accepted - 2026-03-04

<!-- Issue #116 DEC-006-T による意思決定 -->

## 背景

Amazon Aurora のデータベースエンジンを正式に選定・文書化する必要がある。

### 現状の前提

- Prisma schema (`projects/apps/api/prisma/schema.prisma`) が `provider = "postgresql"` を使用中
- ADR-0015 (CDN/CloudFront 戦略) で「RDS (PostgreSQL)」を参照

### 課題

Aurora には以下の 2 つのエンジン互換モードがある：

1. **Aurora PostgreSQL-Compatible Edition** — PostgreSQL プロトコル/SQL を実装
2. **Aurora MySQL-Compatible Edition** — MySQL プロトコル/SQL を実装

どちらのエンジンを採用するかを、Aurora マネージド機能の差異・用途適性・ORM との相性等を含めて比較検討し、ADR として記録する必要がある。

### 負荷想定

- DAU（日次アクティブユーザー）: 平均 1,500 人
- リリース初速: 瞬間負荷で約 10 倍（〜15,000 同時接続）を想定
- **大規模トラフィックへの対応はアーキテクチャ層で行う方針**（購入制限・在庫管理・カート・待合室等でトランザクション流量を制限）

## 決定内容

**Amazon Aurora MySQL-Compatible Edition を採用する。**

性能差ではなく **Aurora マネージドサービスとしての機能性**を重視し、総合的に MySQL 互換を選定した。

### 選定の核心的な考え方

1. **性能差よりマネージド機能で選ぶ**: DAU 1,500・ピーク 15,000 規模では PostgreSQL/MySQL の性能差は決定的要因にならない。Aurora のマネージド機能の差が重要
2. **大規模トラフィックはアーキテクチャで対応**: DB エンジンの性能に頼るのではなく、購入制限（在庫）・カート・待合室等のアプリケーション層でトランザクション流量を制限する方針

### 1. Aurora 固有の比較（決定的要因）

| 観点 | Aurora PostgreSQL | Aurora MySQL | 判定 |
|------|-------------------|--------------|------|
| ストレージ | 共有ストレージ（最大 128 TiB） | 共有ストレージ（最大 128 TiB） | 同等 |
| マルチ AZ | 自動フェイルオーバー（通常 30 秒以内） | 自動フェイルオーバー（通常 30 秒以内） | 同等 |
| Serverless v2 | 対応（ACU 自動スケール） | 対応（ACU 自動スケール） | 同等 |
| **バックトラック（巻き戻し）** | **非対応** | **対応（最大 72 時間前まで巻き戻し可能）** | **MySQL 優位** |
| バージョンアップデート速度 | Aurora PostgreSQL はアップデートが遅れる傾向 | **MySQL の方がアップデートが早い** | **MySQL 優位** |
| Babelfish | SQL Server 互換レイヤーが利用可能 | 非対応 | PostgreSQL 優位（本 PJ では不要） |
| リードレプリカ | 最大 15 台 | 最大 15 台 | 同等 |
| バージョンサポート | PostgreSQL 13〜16 互換 | MySQL 8.0 互換 | 同等 |

**バックトラック機能**は Aurora MySQL 固有の機能であり、オペレーションミスやデータ不整合発生時にダウンタイムなしで特定時点に巻き戻しが可能。本番運用の安全性を大きく高める。

### 2. PostgreSQL vs MySQL の性能比較・用途の違い

| 観点 | PostgreSQL | MySQL | 判定 |
|------|-----------|-------|------|
| 読み取り性能 | MVCC によりロックなし読み取り。複雑な JOIN/サブクエリでも安定 | 単純な主キー検索が高速。InnoDB のクラスタードインデックスが有利 | 用途依存 |
| 書き込み性能 | MVCC の VACUUM コストあり。大量 UPDATE 時にやや不利 | 軽量な行ロックで単純 INSERT/UPDATE が高速 | 用途依存 |
| 同時接続・並行処理 | MVCC により読み取り/書き込みが互いをブロックしにくい | テーブルロック/行ロックの設計が MySQL 固有。高並行書き込み時に注意 | PostgreSQL 優位 |
| 複雑なクエリ | CTE、Window 関数、LATERAL JOIN、再帰クエリのフルサポート | MySQL 8.0+ で CTE/Window 関数をサポート。ただし最適化の成熟度に差 | PostgreSQL 優位 |
| 分析・集計ワークロード | JSONB、配列型、高度な集計関数、パーティショニング | JSON 型あるが JSONB 相当なし。分析向け機能は限定的 | PostgreSQL 優位 |
| シンプルな CRUD | やや重い初期化コスト | 軽量でシンプルな CRUD に最適化 | **MySQL 優位** |
| 全文検索 | pg_trgm、ts_vector によるネイティブ全文検索 | FULLTEXT インデックス（InnoDB）。日本語は MeCab プラグインが必要 | PostgreSQL 優位 |
| 拡張機能 | PostGIS、pg_trgm、uuid-ossp、hstore 等の豊富な拡張 | 拡張機能は限定的。ストアドプロシージャで補完 | PostgreSQL 優位 |

**本プロジェクトへの適用**: DAU 1,500 規模では上記の性能差は決定的ではない。PostgreSQL の高度な機能（JSONB、配列型等）は有用だが、本プロジェクトの主要ワークロードはシンプルな CRUD が中心であり、MySQL の特性でも十分にカバーできる。大規模トラフィック時の性能はアーキテクチャ（待合室・購入制限等）で制御する方針のため、DB エンジン単体の性能差に依存しない。

### 3. ORM / ORMapper との相性

| 観点 | PostgreSQL + Prisma | MySQL + Prisma | 判定 |
|------|-------------------|----------------|------|
| 基本サポート | `provider = "postgresql"` でネイティブ対応 | `provider = "mysql"` でネイティブ対応 | 同等 |
| 既存 schema 互換 | 現在の schema をそのまま利用可能 | provider 変更 + マイグレーション再作成が必要 | PostgreSQL 優位 |
| Enum 型 | PostgreSQL ネイティブ Enum を生成。型安全 | MySQL では ENUM 型を使用。Prisma の扱いに微差あり | 同等 |
| JSON 操作 | `JsonFilter` で JSONB のネイティブフィルタリング対応 | JSON 型のフィルタリングは制限あり | PostgreSQL 優位 |
| 配列型 | `Int[]`, `String[]` 等の配列フィールドをネイティブサポート | MySQL は配列型未サポート。Prisma でも利用不可 | PostgreSQL 優位 |
| マイグレーション | `prisma migrate` が PostgreSQL DDL を安定生成 | `prisma migrate` が MySQL DDL を生成。照合順序の差異に注意 | 同等 |

**移行コストの評価**: Prisma schema の `provider` 変更とマイグレーション再作成が必要。ただし現時点でスキーマが小規模（AuthUser、RefreshToken、AuditLog）であり、移行コストは許容範囲内。配列型や JSONB フィルタリングは JSON カラム + アプリケーション層で代替可能。

### 4. プロジェクト固有の検討

| 観点 | PostgreSQL | MySQL | 判定 |
|------|-----------|-------|------|
| 既存コードベース | `provider = "postgresql"` 使用中、変更不要 | provider 変更 + マイグレーション再作成 | PostgreSQL 優位 |
| Aurora マネージド機能 | バックトラック非対応 | **バックトラック対応、アップデートが早い** | **MySQL 優位** |
| 主要ワークロード | シンプル CRUD にはオーバースペック | シンプル CRUD に最適化 | **MySQL 優位** |
| 負荷対策の方針 | DB 性能に依存した設計になりがち | アーキテクチャ層での流量制御と親和性が高い | **MySQL 優位** |

### 選定理由まとめ

1. **Aurora マネージド機能の優位性**: バックトラック（巻き戻し）機能は Aurora MySQL 固有であり、本番運用の安全性を大きく向上させる。アップデートの速さもメリット
2. **性能差は決定的要因にならない**: DAU 1,500・ピーク 15,000 規模では両エンジンの性能差は無視できる。大規模トラフィックはアーキテクチャ層（購入制限・カート・待合室）で対応する方針
3. **ワークロードとの適合**: 主要ワークロードがシンプルな CRUD 中心であり、MySQL の特性が適合する
4. **移行コストの許容**: 現時点でスキーマが小規模なため、PostgreSQL → MySQL への Prisma 移行コストは限定的

## 結果

### ポジティブな影響

- Aurora バックトラック機能により、オペレーションミス時の迅速な復旧が可能
- Aurora MySQL のアップデートが早く、セキュリティパッチやバグフィックスを迅速に適用可能
- シンプル CRUD のパフォーマンスが最適化される
- 大規模トラフィック対策をアーキテクチャ層に委ねる設計方針が明確になる

### ネガティブな影響

- Prisma schema の `provider` 変更とマイグレーション履歴の再作成が必要
- PostgreSQL 固有機能（JSONB ネイティブフィルタリング、配列型）が利用不可
- ADR-0015 との整合性更新が必要
- PostgreSQL の高度なクエリ機能（LATERAL JOIN 等）が利用不可

### 緩和策

- Prisma 移行は現スキーマが小規模な今のタイミングで実施する（コスト最小化）
- JSON データ操作はアプリケーション層で処理し、DB 固有機能への依存を最小化する
- ADR-0015 を Aurora MySQL 前提に更新する
- 大規模トラフィック対策として、待合室・購入制限・在庫管理の設計を別途 ADR 化する
- MySQL Workbench 等の MySQL 対応管理ツールを標準ツールとして採用する

## トラフィック対策方針

本プロジェクトでは、DB エンジンの性能に依存せず、以下のアーキテクチャ施策でトラフィック流量を制御する：

| 施策 | 目的 |
|------|------|
| 待合室（Virtual Waiting Room） | リリース初速の瞬間負荷（〜15,000）をキューイングし、DB への同時アクセスを平準化 |
| 購入制限（在庫管理） | 在庫数に基づくトランザクション発行の上限制御 |
| カート有効期限 | カート保持時間を制限し、不要なロック・トランザクションを防止 |
| リードレプリカ活用 | 参照系クエリをレプリカに分散し、プライマリの書き込み性能を確保 |

これにより、DAU 1,500 の通常負荷はもちろん、リリース初速 10 倍（〜15,000）の瞬間負荷にも対応可能な設計とする。

## 検討した代替案

### 代替案 A: Aurora PostgreSQL-Compatible Edition

- **概要**: Amazon Aurora PostgreSQL 互換エンジンを採用する案（当初案）
- **不採用理由**:
  - Aurora バックトラック機能が利用できない
  - バージョンアップデートが Aurora MySQL より遅れる傾向
  - 高度な PostgreSQL 固有機能は本プロジェクトのワークロード（シンプル CRUD 中心）には過剰
  - 性能差は DAU 1,500 規模では決定的ではなく、大規模トラフィックはアーキテクチャ層で対処する方針

### 代替案 B: Amazon RDS for MySQL（非 Aurora）

- **概要**: Aurora を使用せず、標準 Amazon RDS (MySQL) を採用する案
- **不採用理由**:
  - Aurora のストレージ自動拡張（最大 128 TiB）、マルチ AZ 自動フェイルオーバーを活用できない
  - Aurora Serverless v2 のワークロードに応じた自動スケール機能を失う
  - Aurora バックトラック機能を失う

### 代替案 C: Amazon DynamoDB

- **概要**: リレーショナル DB をやめ、NoSQL (DynamoDB) を採用する案
- **不採用理由**:
  - 現在のデータモデル（AuthUser、RefreshToken、AuditLog の正規化されたリレーション）は RDB が適切
  - 複数テーブル JOIN が必要なクエリパターンに DynamoDB は不向き
  - Prisma との統合には追加のアダプター実装が必要
  - アーキテクチャ全体の変更を伴い、スコープが大幅に拡大する

## 参考情報

- Issue #116: [Architect] DEC-006-T: Aurora エンジン (PostgreSQL/MySQL) を確定し ADR 化
- ADR-0015: CDN/CloudFront 戦略（RDS PostgreSQL 参照 → 要更新）
- `projects/apps/api/prisma/schema.prisma` — 現在の PostgreSQL プロバイダー設定（要変更）
- [Amazon Aurora Backtrack](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Managing.Backtrack.html)
- [Amazon Aurora MySQL vs PostgreSQL 互換性比較](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMySQL.html)
- [Prisma — Supported databases](https://www.prisma.io/docs/orm/reference/supported-databases)
