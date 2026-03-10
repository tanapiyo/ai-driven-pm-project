---
name: fsd-frontend
description: Feature-Sliced Design for React/Next.js frontend. Apply when organizing frontend code, creating features, or reviewing UI structure. Triggers on "feature", "component", "React", "Next.js", "frontend", "UI", "FSD", "slice".
globs:
  - "projects/apps/web/**"
  - "**/features/**"
  - "**/entities/**"
  - "**/shared/ui/**"
alwaysApply: false
---

# Feature-Sliced Design (FSD)

Frontend architecture for scalable React/Next.js apps.

## Layer Structure

```
src/
├── app/        # Next.js app router, global providers
├── pages/      # (if using pages router)
├── widgets/    # Composite UI blocks (optional)
├── features/   # User interactions, business features
├── entities/   # Business entities (User, Product, etc.)
└── shared/     # Reusable utilities, UI kit, types
```

## Dependency Rule

```
app → widgets → features → entities → shared
```

**Higher layers can import from lower layers, not vice versa.**

## Slice Structure

Each slice in features/entities follows:

```
features/auth/
├── ui/           # React components
├── model/        # State, hooks, logic
├── api/          # API calls
├── lib/          # Utilities for this feature
└── index.ts      # Public API (only export what's needed)
```

## Next.js App Router Integration

```
app/
├── (auth)/
│   ├── login/page.tsx     # Uses features/auth
│   └── register/page.tsx
├── dashboard/
│   └── page.tsx           # Uses features/dashboard
└── layout.tsx             # Global layout, providers
```

## Rules

### 1. Public API Only
```typescript
// features/auth/index.ts
export { LoginForm } from './ui/LoginForm';
export { useAuth } from './model/useAuth';
// Don't export internal components
```

### 2. No Cross-Feature Imports
```typescript
// features/cart/ui/Cart.tsx
import { ProductCard } from '@/entities/product'; // ✅ OK
import { CheckoutButton } from '@/features/checkout'; // ❌ NO
```

### 3. Shared is Framework-Agnostic
```typescript
// shared/lib/formatDate.ts - No React imports
// shared/ui/Button.tsx - Pure UI, no business logic
```

## When to Break Rules

- **Widgets**: When features need to compose, use widgets layer
- **Cross-feature**: Use events/context, not direct imports
- **Prototype**: Mark with TODO, refactor before merge

## Dark Mode

All components MUST support dark mode. Use `neutral-*` scale (not `gray-*`).

### Color Mapping

| Light | Dark | Usage |
|-------|------|-------|
| `bg-white` | `dark:bg-neutral-800` | Card/surface |
| `bg-neutral-50` | `dark:bg-neutral-900` | Page background |
| `text-neutral-900` | `dark:text-neutral-100` | Primary text |
| `text-neutral-600` | `dark:text-neutral-400` | Secondary text |
| `border-neutral-200` | `dark:border-neutral-700` | Borders |

### Component Checklist

- [ ] All background colors have `dark:` variant
- [ ] All text colors have `dark:` variant
- [ ] All border colors have `dark:` variant
- [ ] Hover states include `dark:hover:`
- [ ] Focus rings include `dark:focus:ring-offset-neutral-900`
- [ ] WCAG AA contrast (4.5:1 minimum)

→ Full guidelines: `docs/01_product/design_system/dark-mode-guidelines.md`

## See Also

- [Feature-Sliced Design](https://feature-sliced.design/)
- `docs/01_product/design_system/` for design tokens
- `docs/01_product/design_system/dark-mode-guidelines.md` for dark mode
