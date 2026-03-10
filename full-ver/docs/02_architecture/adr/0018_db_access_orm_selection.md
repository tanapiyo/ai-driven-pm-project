# ADR-0018: ORM / クエリビルダー選定

## ステータス

Accepted - 2026-03-06

<!-- Issue #190 [Architect] ORM/Query Builder 選定 ADR 作成 -->
<!-- ADR-0017 (Aurora MySQL 選定) を受けた Infrastructure 層のデータアクセス実装方針 -->

## 背景

ADR-0017 にて Amazon Aurora MySQL-Compatible Edition の採用が決定した。
これに伴い、Infrastructure 層（Clean Architecture）のデータアクセスに使用する ORM / クエリビルダーを選定・文書化する必要がある。

### 現状

- `projects/apps/api/prisma/schema.prisma` が `provider = "postgresql"` で Prisma を使用中
- Infrastructure 層のリポジトリ実装（`PrismaUserRepository` 等）が Prisma Client の型に依存
- ADR-0017 の決定により、`provider = "postgresql"` → `provider = "mysql"` への変更が必要

### 選定の前提条件

| 条件 | 内容 |
|------|------|
| データベース | Aurora MySQL-Compatible Edition（MySQL 8.0 互換） |
| アーキテクチャ | Clean Architecture — Infrastructure 層がリポジトリインターフェースを実装 |
| 言語 / ランタイム | TypeScript / Node.js |
| 現行採用 | Prisma（PostgreSQL プロバイダー） |

### 評価基準

1. **Aurora MySQL 互換性**: MySQL 8.0 との公式サポート状況
2. **Clean Architecture 整合性**: Domain 層を汚染せず、Infrastructure 層に閉じて実装できるか
3. **型安全性**: TypeScript との親和性
4. **マイグレーション機能**: スキーマ変更の DDL 自動生成・適用の成熟度
5. **コミュニティ成熟度**: 本番実績・npm ダウンロード数・エコシステム
6. **移行コスト**: 現行 Prisma（PostgreSQL）からの変更量

## 決定内容

**Prisma を継続採用し、`provider` を `"postgresql"` から `"mysql"` に変更する。**

ADR-0017 で Aurora MySQL 採用が決定したため、データベースエンジンの切り替えは必須である。
しかし ORM 自体を置き換える合理的な理由はなく、Prisma の `provider` 変更のみで対応できる。

### 選定の核心的な理由

1. **移行コスト最小**: `provider = "mysql"` への変更と `@prisma/adapter-mysql2` の導入のみで対応可能。既存のリポジトリ実装（UseCase・Domain 層）は変更不要
2. **Clean Architecture との完全な整合**: Prisma は Infrastructure 層のみに閉じて使用でき、Domain 層（リポジトリインターフェース）に変更を与えない
3. **Aurora MySQL の公式サポート**: Prisma は MySQL 8.0 を公式にサポートしており、Aurora MySQL 互換エンジンでの実績も豊富
4. **成熟した `prisma migrate`**: MySQL DDL の自動生成・適用が本番環境でも安定して動作する
5. **チーム知識の継続性**: 学習コストゼロで移行できる

### 候補比較

| 評価軸 | Prisma（provider 変更） | Drizzle ORM | Kysely | TypeORM |
|--------|------------------------|-------------|--------|---------|
| Aurora MySQL 互換性 | 高（公式） | 高 | 高 | 高 |
| Clean Architecture 整合性 | **高**（既存パターン維持） | 中（カスタム実装要） | 中（カスタム実装要） | 低（Active Record がドメイン汚染リスク） |
| 型安全性 | 高 | 高 | 高 | 中 |
| マイグレーション機能 | **高**（`prisma migrate` 実績豊富） | 中（`drizzle-kit` 発展途上） | 低（別途ツールが必要） | 中 |
| コミュニティ成熟度 | **高**（npm 週間 500 万 DL 以上） | 中（2022 年〜、急成長中） | 中 | 中（開発停滞傾向） |
| 移行コスト（現行 Prisma から） | **最小**（provider 変更のみ） | 高（全面書き直し） | 高（全面書き直し） | 高（全面書き直し） |

### Clean Architecture における位置づけ

```
presentation → usecase → domain ← infrastructure
                                        ↑
                               Prisma はここのみ
                          （PrismaXxxRepository 等）
```

Prisma Client は Infrastructure 層のリポジトリ実装にのみ依存し、Domain 層（`UserRepository` インターフェース等）や UseCase 層には一切露出しない。
この原則は現行実装でも維持されており、`provider` 変更後も同様に維持される。

### Aurora MySQL 切り替え時の実装変更内容

| 変更箇所 | 変更内容 |
|---------|---------|
| `schema.prisma` | `provider = "postgresql"` → `provider = "mysql"` |
| 依存パッケージ | `@prisma/adapter-pg` → `@prisma/adapter-mysql2` + `mysql2` |
| マイグレーション履歴 | PostgreSQL 向けマイグレーションをリセットし、MySQL 向けに再作成 |
| `mode: 'insensitive'` フィルター | MySQL 非対応のため、MySQL の照合順序（`utf8mb4_unicode_ci`）またはアプリケーション層フィルターに置き換え |

これらの変更は Infrastructure 層に閉じており、Domain 層・UseCase 層・Presentation 層への影響はない。
実装作業の詳細は別途 Issue を作成して追跡する。

## 結果

### ポジティブな影響

- ORM 置き換えによるリスクをゼロにして Aurora MySQL 移行を完了できる
- リポジトリインターフェース（Domain 層）・UseCase 層のコードが変更不要
- `prisma migrate` の安定した DDL 生成・適用能力を維持できる
- Prisma Studio、型生成等の既存ツールチェーンをそのまま活用できる
- チームの学習コストが発生しない

### ネガティブな影響

- PostgreSQL 固有機能（JSONB ネイティブフィルタリング、配列型 `Int[]` 等）が利用不可になる（ADR-0017 既出）
- `mode: 'insensitive'` を使用している既存クエリの修正が必要
- PostgreSQL 向けマイグレーション履歴をリセットし、MySQL 向けに再作成する作業が発生する

### 緩和策

- `mode: 'insensitive'` の代替として、テーブルの照合順序を `utf8mb4_unicode_ci` に設定することで大文字小文字を区別しない検索を実現する
- JSONB / 配列型の代替として、JSON カラム + アプリケーション層での処理に切り替える（スキーマ設計時に考慮）
- マイグレーション再作成は現時点でスキーマが小規模（`AuthUser`、`RefreshToken`、`AuditLog` の 3 モデル）のため影響が限定的

## 検討した代替案

### 代替案 A: Drizzle ORM

- **概要**: 2022 年にリリースされた TypeScript ファーストの ORM。SQL ライクな記法とスキーマ定義をコードで行う設計が特徴
- **却下理由**:
  - 現行 Prisma からの全面書き直しが必要（リポジトリ実装、スキーマ定義ともに移行コスト大）
  - `drizzle-kit`（マイグレーションツール）が発展途上であり、本番環境での実績が Prisma より少ない
  - 2022 年リリースのため、比較的新しいライブラリとしてのリスク（重大な Breaking Change の可能性）がある
  - Aurora MySQL との組み合わせでの本番実績が限定的

### 代替案 B: Kysely

- **概要**: TypeScript 型安全なクエリビルダー。ORM ではなくクエリビルダーのため、スキーマ管理は別途ツールが必要
- **却下理由**:
  - マイグレーション機能を持たず、`kysely-ctl` 等の別途ツールが必要でツールチェーンが複雑化する
  - ORM ではないため、リレーション管理・型生成を自前で実装する必要があり、コード量が大幅に増加する
  - シンプルな CRUD 中心のワークロードに対してオーバースペックな設計負荷が発生する
  - 現行 Prisma からの移行コストが最も高い

### 代替案 C: TypeORM

- **概要**: Node.js / TypeScript の老舗 ORM。ActiveRecord パターンと DataMapper パターンの両方をサポート
- **却下理由**:
  - ActiveRecord パターンはエンティティが DB アクセスロジックを内包するため、Clean Architecture の Domain 層純粋性を損なうリスクがある
  - DataMapper パターンで使用しても、型安全性が Prisma より劣る（型生成が弱い）
  - 近年の開発活動が停滞傾向にあり、Prisma と比較してエコシステムの勢いが弱い
  - 現行 Prisma からの移行コストが高い

## 参考情報

- Issue #190: [Architect] ORM/Query Builder 選定 ADR 作成
- ADR-0017: Aurora エンジン選定（PostgreSQL 互換 vs MySQL 互換）— Aurora MySQL 採用の背景決定
- `projects/apps/api/prisma/schema.prisma` — 現在の PostgreSQL プロバイダー設定（要変更）
- [Prisma — Supported databases](https://www.prisma.io/docs/orm/reference/supported-databases)
- [Prisma — MySQL connector](https://www.prisma.io/docs/orm/overview/databases/mysql)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Kysely](https://kysely.dev/)
