# Design System Overview

## Purpose

このデザインシステムは、UIの一貫性と開発効率を確保するための契約（Contract）です。
特定のUIフレームワークに依存せず、命名規則・粒度・トークン形式を定義します。

---

## Principles

1. **Consistency**: 同じ要素は同じ見た目・動作
2. **Scalability**: 拡張しても破綻しない構造
3. **Accessibility**: すべてのユーザーが使える
4. **Performance**: 軽量で高速

---

## Token Categories

| Category | Description | Example |
|----------|-------------|---------|
| Color | 色定義 | `color.primary.500` |
| Typography | フォント関連 | `font.size.base` |
| Spacing | 余白・間隔 | `space.4` |
| Border | ボーダー | `border.radius.md` |
| Shadow | シャドウ | `shadow.md` |
| Animation | アニメーション | `duration.normal` |

---

## Token Naming Convention

```
{category}.{variant}.{scale}
```

Examples:
- `color.primary.500`
- `font.size.lg`
- `space.8`
- `border.radius.md`

---

## File Structure

```
design/
└── tokens/
    ├── README.md           # トークン使用ガイド
    └── tokens.json         # トークン定義
```

---

## Integration

トークンは以下の形式で出力可能です：
- CSS Custom Properties
- SCSS Variables
- JavaScript/TypeScript Constants
- Tailwind CSS Config

---

## Form Validation States

フォームの入力フィードバックは以下を標準とする。

- `Default`: `border-neutral-*`
- `Error`: `border-error-*` + フィールド直下エラーテキスト
- `Success`: `border-success-*` + チェックアイコン
- `Required`: ラベル末尾に赤アスタリスク
- `Helper`: URL形式/単位/入力例をフィールド直下に表示

すべての状態色には `dark:` variant を定義する。

---

## Loading Patterns

データ読み込み中のローディング表示は以下の2パターンを使い分ける。

### Skeleton（コンテンツプレースホルダー）

コンテンツの形状を模したプレースホルダーを表示し、レイアウトシフトを防止する。
`animate-pulse` アニメーションを使用。

| バリアント | 用途 | コンポーネント |
|-----------|------|--------------|
| Table | テーブルリスト | `SkeletonTable` |
| Card | カード形式コンテンツ | `SkeletonCard` |
| Detail | 詳細ページ | `SkeletonDetail` |
| Base | 任意の形状 | `Skeleton` |

**使い分け**: コンテンツの構造が予測可能な場合（テーブル、カード等）に使用。

### Spinner（回転インジケーター）

回転アニメーションで処理中であることを伝える。
`animate-spin` アニメーションを使用。

| バリアント | 用途 | コンポーネント |
|-----------|------|--------------|
| Page | ページ全体のローディング | `PageSpinner` |
| Inline | セクション内のローディング | `InlineSpinner` |
| Button | ボタン内の処理中状態 | `ButtonSpinner` |

**使い分け**: コンテンツ構造が不明な場合や、短時間の処理待ちに使用。

### 共通仕様

- ダークモード対応: `neutral-*` カラー使用、`dark:` variant 必須
- アクセシビリティ: `role="status"` + `aria-label` 設定
- コンポーネント配置: `shared/ui/` レイヤー

---

## Empty State Pattern

データが存在しない・検索/フィルタ結果がゼロ件の場合に表示する統一コンポーネント。

### スロット構成

| Slot | Required | Description |
|------|----------|-------------|
| icon | auto | Lucide アイコン（バリアント既定値あり） |
| message | auto | 主要メッセージ（バリアント既定値あり） |
| subMessage | auto | 補足メッセージ（バリアント既定値あり） |
| action | optional | アクションボタン（label + onClick） |
| children | optional | カスタムアクション（action 未指定時に表示） |

### プリセットバリアント

| Variant | Icon | 用途 |
|---------|------|------|
| `no-data` | Database | データ未登録 |
| `no-results` | Search | 検索結果なし |
| `no-filter-results` | SlidersHorizontal | フィルタ結果なし |

### トークン

- 背景: `bg-neutral-100` / `dark:bg-neutral-800`
- メッセージ: `text-neutral-900` / `dark:text-neutral-100`
- 補足テキスト: `text-neutral-600` / `dark:text-neutral-400`
- アイコン: `text-neutral-400` / `dark:text-neutral-500`

### 使用方法

```tsx
import { EmptyState } from '@/shared/ui';

<EmptyState variant="no-results" />
<EmptyState
  variant="no-data"
  action={{ label: 'データを追加', onClick: handleAdd }}
/>
```

---

## Links

- [design/tokens/tokens.json](../../../design/tokens/tokens.json) - トークン定義
- [docs/01_product/design_system/tokens.schema.md](tokens.schema.md) - トークンスキーマ
