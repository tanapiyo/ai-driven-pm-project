# Security Rules (Always Applied)

## Absolute Prohibitions (NEVER)

| Category        | NEVER do this                                      |
|-----------------|----------------------------------------------------|
| Secrets         | Commit secrets to git                              |
| Logging         | Log passwords, tokens, API keys, PII               |
| SQL             | Interpolate user input into queries                |
| Files           | Read/Write `.env*`, `*.pem`, `*.key`, `secrets/`   |

## Required Practices (MUST)

| Category        | MUST do this                                       |
|-----------------|----------------------------------------------------|
| Input           | Validate ALL user input at boundaries (use Zod)    |
| Auth            | Use established libraries (Passport, next-auth)    |
| Passwords       | Hash with bcrypt (cost ≥ 12)                       |
| Authorization   | Deny by default, allow explicitly                  |
| Queries         | Use parameterized queries / ORM only               |
| Dependencies    | Run `./tools/contract audit` before adding new deps |

## Detailed Reference

→ `.claude/skills/security-baseline/SKILL.md`
