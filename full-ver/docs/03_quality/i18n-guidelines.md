# i18n ガイドライン — 文言辞書の追加・運用手順

> Issue #173 で導入された文言辞書システムの運用ルールです。

---

## 概要

UI の文言（ラベル、ボタンテキスト、見出し等）は直接コンポーネントに書かず、
**辞書ファイルを経由して参照**してください。

```
辞書ファイル: projects/apps/web/src/shared/lib/i18n/dictionary.ts
ヘルパー関数:  projects/apps/web/src/shared/lib/i18n/t.ts
```

---

## 新規文言の追加手順

### Step 1: 適切な名前空間を決める

辞書はネスト構造になっています。機能・画面ごとに名前空間が分かれています。

| 名前空間 | 用途 |
|---------|------|
| `common.actions` | 保存・キャンセル等の汎用アクション |
| `common.status` | ローディング・エラー等の状態表示 |
| `auth.login` | ログイン画面 |
| `navigation.sidebar` | サイドバーの固定文言 |
| `navigation.menu` | ナビゲーションメニューラベル |
| `navigation.breadcrumb` | パンくずリストのラベル |
| `dashboard` | ダッシュボード画面 |
| `settings.nav` | 設定ページのナビゲーション |
| `settings.account` | アカウント情報カード |
| `settings.theme` | テーマ設定 |
| `settings.passwordChange` | パスワード変更ダイアログ |
| `error` | エラーページ |

新しい機能の場合は、対応する名前空間を `dictionary.ts` に追加してください。

### Step 2: `dictionary.ts` にエントリを追加する

```ts
// projects/apps/web/src/shared/lib/i18n/dictionary.ts

export const dictionary = {
  // ...既存エントリ...

  /** 新機能: 例として "notification" を追加 */
  notification: {
    markAllRead: '全て既読にする',
    noNotifications: '通知はありません',
  },
} as const;
```

**ルール:**

- キー名は英語のキャメルケース（例: `markAllRead`, `userButton`）
- 値は日本語の文言
- `{{variable}}` 形式で変数プレースホルダーを使用可能（例: `'こんにちは、{{name}}さん'`）
- コメント（`/** ... */`）で文言のコンテキストを説明する

### Step 3: コンポーネントから辞書を参照する

```tsx
// 辞書から直接参照する場合
import { dictionary } from '@/shared/lib';

const notif = dictionary.notification;

function NotificationBell() {
  return <span>{notif.markAllRead}</span>;
}
```

変数補間が必要な場合は `t()` ヘルパーを使用します:

```tsx
import { t } from '@/shared/lib';

// '{{name}}' プレースホルダーを置換
const message = t('dashboard.welcome', { vars: { name: user.name } });
// => 'ようこそ、Aliceさん'
```

---

## t() ヘルパーの API

```ts
import { t } from '@/shared/lib';
import type { TranslationKey } from '@/shared/lib';

// 基本的な文言取得
t('common.actions.save')           // => '保存'
t('navigation.menu.dashboard')     // => 'ダッシュボード'

// 変数補間
t('dashboard.welcome', { vars: { name: 'Alice' } })
// => 'ようこそ、Aliceさん'

// キーが存在しない場合はキー自体を返す（フォールバック）
t('unknown.key')  // => 'unknown.key'
```

---

## テストの書き方

新しい文言を追加したら、辞書テストを更新してください:

```ts
// projects/apps/web/src/shared/lib/i18n/__tests__/dictionary.test.ts

it('should have notification strings', () => {
  expect(dictionary.notification.markAllRead).toBe('全て既読にする');
  expect(dictionary.notification.noNotifications).toBe('通知はありません');
});
```

---

## 将来の i18n ライブラリ移行

このシステムは **next-intl** や **react-i18next** への移行を前提に設計されています。

### 移行ステップ（移行時の参考）

1. ライブラリをインストール（`next-intl` 等）
2. `dictionary.ts` のオブジェクトをライブラリのメッセージファイルとして渡す
3. `t()` ヘルパーをライブラリの `t()` / `useTranslations()` に置き換える
4. キー構造はそのまま使用可能（変更不要）

移行時にコンポーネント側のコードはほぼ変更が不要になるよう設計されています。

---

## 使い分けルール

| パターン | 使用場面 | 例 |
|---------|---------|-----|
| `dictionary.*` 直接参照 | 静的な文言（変数なし） | `{db.title}` |
| `t()` ヘルパー | 変数補間が必要な場合 | `t('dashboard.welcome', { vars: { name } })` |

同一ファイル内で両方を使う場合、上記の使い分けに従ってください。

## 適用範囲

- **新規コード**: 辞書経由を**必須**とする
- **既存コード**: 段階的に移行する（一括移行は不要）
- 既存の直書き文言が残っていても、新規追加分は辞書を使うこと

## 禁止事項

| 禁止 | 理由 |
|------|------|
| 新規コンポーネントでの文言直書き | 辞書への一元化が崩れる |
| 辞書キーの削除（使用中のキーを削除） | コンポーネントが参照エラーになる |
| 日本語のキー名 | キャメルケース英語を使う |
| `t()` の戻り値を `dangerouslySetInnerHTML` に渡す | HTML-safe ではない |

---

## 関連ファイル

- `projects/apps/web/src/shared/lib/i18n/dictionary.ts` — 辞書定義
- `projects/apps/web/src/shared/lib/i18n/t.ts` — `t()` ヘルパー
- `projects/apps/web/src/shared/lib/i18n/__tests__/` — テスト
