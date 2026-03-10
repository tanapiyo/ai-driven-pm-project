# Frontend Rules (Always Applied)

## Architecture: Feature-Sliced Design (FSD)

```text
app → widgets → features → entities → shared
```

**Higher layers import from lower layers, never vice versa.**

## Layer Constraints (MUST)

| Rule                   | Description                                    |
|------------------------|------------------------------------------------|
| Public API only        | Import from `index.ts`, not internal files     |
| No cross-feature       | Use events/context, not direct imports         |
| Shared is agnostic     | No React/Next.js in `shared/lib/`              |
| Design tokens          | No inline styles, use design system            |

## Dark Mode (MUST)

- Use `neutral-*` not `gray-*` for grayscale
- All colors need `dark:` variant
- WCAG AA contrast (4.5:1 minimum)
