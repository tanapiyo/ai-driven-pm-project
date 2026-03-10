# Quality Rules (Always Applied)

## Golden Commands (MUST use)

```bash
./tools/contract format       # Prettier
./tools/contract lint         # ESLint
./tools/contract typecheck    # TypeScript
./tools/contract test         # Unit tests
./tools/contract build        # Production build
```

**NEVER run raw `pnpm lint` or `npm test` directly.**

## Fix Order (MUST follow when CI fails)

```text
format → lint → typecheck → test → build
```

## Code Standards (MUST NOT)

| MUST NOT                    | Why                         |
| --------------------------- | --------------------------- |
| `console.log` in production | Use structured logger       |
| Commented-out code          | Delete or use feature flags |
| TODO without issue link     | Track in issue tracker      |
| Magic numbers               | Use named constants         |
