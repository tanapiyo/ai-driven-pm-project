# GitHub Copilot Repository Instructions

**Canonical instructions are in `AGENTS.md`.** If conflicts exist, follow `AGENTS.md`.

---

## Core Principles

1. **DocDD (Document-Driven Development)**
   - Never start implementation without Spec / Plan / AC
   - Update related docs when changing code

2. **Golden Commands via Contract**
   - Always use `./tools/contract <cmd>`, never direct commands
   - Commands: `format`, `lint`, `typecheck`, `test`, `build`, `e2e`, `migrate`, `deploy-dryrun`

3. **Minimal Diff**
   - Focus on one change per PR
   - Avoid unnecessary refactoring in feature branches

4. **PR Quality**
   - Include DocDD links (Spec / Plan / ADR / AC)
   - Use Conventional Commits format for titles

---

## Quick Reference

```bash
./tools/contract format    # Auto-format
./tools/contract lint      # Static analysis
./tools/contract typecheck # Type checking
./tools/contract test      # Unit tests
./tools/contract build     # Build artifacts
```

## Key Documents

- Process: `docs/00_process/process.md`
- Agent Operating Model: `docs/00_process/agent_operating_model.md`
- Skills Catalog: `docs/00_process/skills_catalog.md`
- Architecture: `docs/02_architecture/`
- Quality: `docs/03_quality/`
