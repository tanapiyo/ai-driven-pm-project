# Dark Mode Guidelines

開発者が新規コンポーネント作成時にダークモード対応を忘れず、一貫したスタイルで実装できるようにするためのガイドラインです。

---

## Quick Reference

### Checklist for New Components

新規コンポーネント作成時は以下を確認してください：

- [ ] すべての背景色に `dark:` バリアントを追加
- [ ] すべてのテキスト色に `dark:` バリアントを追加
- [ ] すべてのボーダー色に `dark:` バリアントを追加
- [ ] ホバー状態に `dark:hover:` バリアントを追加
- [ ] フォーカス状態に `dark:focus:` バリアントを追加（リングオフセット含む）
- [ ] 無効状態に `dark:disabled:` バリアントを追加
- [ ] WCAG AA コントラスト比を満たしている（4.5:1 以上）

---

## Color System

### Color Scale: `neutral` を使用

**重要**: グレースケールには `gray-*` ではなく `neutral-*` を使用してください。

```tsx
// ❌ 非推奨
<div className="bg-gray-100 text-gray-900">

// ✅ 推奨
<div className="bg-neutral-100 text-neutral-900">
```

デザイントークン（`design/tokens/tokens.json`）は `neutral` スケールを基準に定義されています。

### Color Mapping Table

| 用途 | Light Mode | Dark Mode | 備考 |
|------|------------|-----------|------|
| **背景** |
| ページ背景 | `bg-neutral-50` | `dark:bg-neutral-900` | メインレイアウト |
| カード/サーフェス | `bg-white` | `dark:bg-neutral-800` | 浮き上がった要素 |
| サーフェス（淡色） | `bg-neutral-50` | `dark:bg-neutral-800` | セクション背景 |
| **テキスト** |
| 主要テキスト | `text-neutral-900` | `dark:text-neutral-100` | 高強調 |
| 補助テキスト | `text-neutral-600` | `dark:text-neutral-400` | 低強調 |
| プレースホルダー | `text-neutral-400` | `dark:text-neutral-500` | 入力ヒント |
| **ボーダー** |
| 標準ボーダー | `border-neutral-200` | `dark:border-neutral-700` | デフォルト |
| ホバーボーダー | `border-neutral-300` | `dark:border-neutral-600` | インタラクティブ |
| **ボタン（Primary）** |
| 背景 | `bg-primary-500` | `dark:bg-primary-600` | CTA |
| ホバー | `hover:bg-primary-600` | `dark:hover:bg-primary-500` | ダークでは明るく |
| **状態色** |
| 情報（Info） | `bg-blue-50` | `dark:bg-blue-900/20` | 通知バナー等 |
| 成功（Success） | `bg-green-50` | `dark:bg-green-900/20` | 完了メッセージ等 |
| 警告（Warning） | `bg-yellow-50` | `dark:bg-yellow-900/20` | 注意喚起 |
| エラー（Error） | `bg-red-50` | `dark:bg-red-900/20` | エラーメッセージ等 |

### Opacity Convention

ダークモードで背景の透明度を使う場合の標準値：

| Opacity | 用途 | 例 |
|---------|------|-----|
| `/20` | 微細な背景 | `dark:bg-primary-900/20` |
| `/30` | 中程度の強調 | `dark:bg-primary-900/30` |
| `/50` | 高い強調（選択状態） | `dark:bg-primary-900/50` |

```tsx
// 例: 選択状態のリストアイテム
<li className={cn(
  "bg-neutral-50 dark:bg-neutral-800",
  isSelected && "bg-primary-50 dark:bg-primary-900/50"
)}>
```

---

## Common Patterns

### 1. カード/サーフェス

```tsx
<div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm">
  <h2 className="text-neutral-900 dark:text-neutral-100">Title</h2>
  <p className="text-neutral-600 dark:text-neutral-400">Description</p>
</div>
```

### 2. フォーム入力

```tsx
<input
  className={cn(
    // 背景とボーダー
    "bg-white dark:bg-neutral-800",
    "border border-neutral-300 dark:border-neutral-600",
    // テキストとプレースホルダー
    "text-neutral-900 dark:text-neutral-100",
    "placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
    // フォーカス状態
    "focus:ring-2 focus:ring-primary-500",
    "focus:ring-offset-2 dark:focus:ring-offset-neutral-900",
    // 無効状態
    "disabled:bg-neutral-100 dark:disabled:bg-neutral-700",
    "disabled:text-neutral-400 dark:disabled:text-neutral-500"
  )}
/>
```

### 3. ボタン（Primary）

```tsx
<button
  className={cn(
    // 背景
    "bg-primary-500 dark:bg-primary-600",
    // テキスト
    "text-white",
    // ホバー（ダークモードでは明るく）
    "hover:bg-primary-600 dark:hover:bg-primary-500",
    // フォーカス
    "focus:ring-2 focus:ring-primary-500",
    "focus:ring-offset-2 dark:focus:ring-offset-neutral-900",
    // 無効
    "disabled:bg-primary-200 dark:disabled:bg-primary-800",
    "disabled:text-primary-400 dark:disabled:text-primary-600"
  )}
>
  Button
</button>
```

### 4. ボタン（Secondary/Outline）

```tsx
<button
  className={cn(
    // 背景
    "bg-transparent",
    // ボーダー
    "border border-primary-500 dark:border-primary-400",
    // テキスト
    "text-primary-600 dark:text-primary-400",
    // ホバー
    "hover:bg-primary-50 dark:hover:bg-primary-900/20",
    // フォーカス
    "focus:ring-2 focus:ring-primary-500",
    "focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
  )}
>
  Button
</button>
```

### 5. インタラクティブリスト

```tsx
<li
  className={cn(
    // ベース
    "bg-white dark:bg-neutral-800",
    "text-neutral-900 dark:text-neutral-100",
    // ホバー
    "hover:bg-neutral-100 dark:hover:bg-neutral-700",
    // 選択状態
    isSelected && "bg-primary-50 dark:bg-primary-900/50"
  )}
>
  {item.name}
</li>
```

### 6. 情報バナー

```tsx
<div
  className={cn(
    // 背景
    "bg-blue-50 dark:bg-blue-900/20",
    // ボーダー
    "border border-blue-200 dark:border-blue-800",
    // テキスト
    "text-blue-700 dark:text-blue-300"
  )}
>
  <InfoIcon className="text-blue-600 dark:text-blue-400" />
  <span>Information message</span>
</div>
```

---

## Accessibility (WCAG)

### Contrast Requirements

すべてのテキストは WCAG 2.1 Level AA を満たす必要があります：

| テキストサイズ | 最小コントラスト比 |
|----------------|-------------------|
| 通常テキスト（< 18px） | 4.5:1 |
| 大きいテキスト（≥ 18px または 14px bold） | 3:1 |

### Verified Color Pairs

以下のカラーペアは検証済みです：

| ペア | コントラスト比 | ステータス |
|------|----------------|-----------|
| `text-neutral-100` on `bg-neutral-900` | 16.1:1 | ✅ AA |
| `text-neutral-400` on `bg-neutral-900` | 4.8:1 | ✅ AA |
| `text-neutral-100` on `bg-neutral-800` | 15.0:1 | ✅ AA |

### Contrast Check Tools

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools: Elements > Styles > Color picker shows contrast ratio
- `eslint-plugin-jsx-a11y` for automated checking

---

## Security Considerations

### localStorage Access

テーマ設定は localStorage に保存されます。以下の点に注意してください：

```typescript
// ✅ 安全なパターン: try-catch でラップ
function readTheme(): Theme {
  try {
    const stored = localStorage.getItem('app:theme');
    // 許可リストでバリデーション
    const validThemes = ['light', 'dark', 'system'];
    if (stored && validThemes.includes(stored)) {
      return stored as Theme;
    }
  } catch {
    // localStorage が使えない場合（プライベートブラウジング等）
  }
  return 'system'; // 安全なデフォルト
}
```

**注意点:**
- localStorage の値は必ずバリデーションする（allowlist 方式）
- try-catch で囲む（プライベートブラウジングでは使用不可の場合がある）
- 機密情報を localStorage に保存しない（XSS で漏洩の可能性）

### Inline Script (FOUC Prevention)

FOUC（Flash of Unstyled Content）防止のインラインスクリプトでは：

- ユーザー入力を絶対に含めない
- localStorage の値を検証する
- 最小限のコードに留める

---

## Theme Provider

テーマの切り替えには `useTheme` フックを使用します：

```tsx
import { useTheme } from '@/features/theme-toggle/model/use-theme';

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Current: {resolvedTheme}
    </button>
  );
}
```

- `theme`: ユーザーの選択（`'light'` | `'dark'` | `'system'`）
- `resolvedTheme`: 実際に適用されるテーマ（`'light'` | `'dark'`）
- `setTheme`: テーマを変更する関数

---

## Configuration

### Tailwind CSS

`darkMode: 'class'` が設定されています（`tailwind.config.js`）：

```javascript
module.exports = {
  darkMode: 'class',
  // ...
};
```

これにより `<html class="dark">` が適用されると、すべての `dark:` バリアントが有効になります。

### Design Tokens

セマンティックカラートークンは `design/tokens/tokens.json` で定義されています：

```json
{
  "color": {
    "semantic": {
      "background": { "light": "#ffffff", "dark": "#171717" },
      "surface": { "light": "#fafafa", "dark": "#262626" },
      "text": {
        "primary": { "light": "#171717", "dark": "#fafafa" },
        "secondary": { "light": "#525252", "dark": "#a3a3a3" }
      },
      "border": { "light": "#e5e5e5", "dark": "#404040" }
    }
  }
}
```

---

## Anti-patterns

### 避けるべきパターン

```tsx
// ❌ gray を使用（neutral を使う）
<div className="bg-gray-100 dark:bg-gray-800">

// ❌ dark: バリアントの欠落
<div className="bg-white text-black">

// ❌ ハードコードされた色
<div style={{ backgroundColor: '#ffffff' }}>

// ❌ 不一致な透明度
<div className="dark:bg-primary-900/40"> // 標準は /20, /30, /50

// ❌ フォーカスリングオフセットの欠落
<button className="focus:ring-2 focus:ring-primary-500">
  // dark:focus:ring-offset-neutral-900 が必要
</button>
```

---

## Testing

### Visual Testing

1. **手動確認**: ThemeToggle で切り替えて両モードを確認
2. **E2E テスト**: `projects/apps/web/e2e/dark-mode.spec.ts` を参照

### E2E Test Example

```typescript
test('dark mode persists after reload', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('app:theme', 'dark');
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
});
```

---

## References

- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [WCAG 2.1 Contrast Requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Design Tokens](../../../design/tokens/README.md)
- [Token Schema](./tokens.schema.md)
- Related Issues: #154, #162, #164, #236, #237
