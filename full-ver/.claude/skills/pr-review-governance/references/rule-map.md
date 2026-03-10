# PR Review Rule Map

Baseline sources to check before and during review.

## 1. Canonical Contract and Process

- `AGENTS.md`
- `docs/00_process/process.md`
- `docs/00_process/git_and_pr_governance.md`
- `docs/00_process/skills_catalog.md`
- `docs/00_process/tdd_workflow.md`
- `docs/00_process/agent_operating_model.md`

## 2. PR Governance and CI Policy

- `.github/pull_request_template.md`
- `.github/PULL_REQUEST_TEMPLATE/01_spec.md`
- `.github/PULL_REQUEST_TEMPLATE/02_plan.md`
- `.github/PULL_REQUEST_TEMPLATE/03_implement.md`
- `.github/PULL_REQUEST_TEMPLATE/04_release.md`
- `.github/workflows/ci.yml`
- `.github/workflows/policy.yml`
- `tools/policy/check_required_artifacts.sh`
- `tools/policy/check_docdd_minimum.sh`

## 3. Product Requirements and Acceptance

- `docs/01_product/identity.md`
- `docs/01_product/prd.md`
- `docs/01_product/design/ui_requirements.md`
- `docs/01_product/implementation/acceptance.md`
- `docs/03_quality/template_acceptance_criteria.md`
- `docs/03_quality/verification_runbook.md`
- `.specify/templates/spec.md`
- `.specify/templates/plan.md`
- `.specify/templates/tasks.md`
- `.specify/scripts/check-spec-exists.sh`
- `.specify/scripts/validate-spec.sh`

## 4. Architecture and API Contract

- `docs/02_architecture/ARCHITECTURE.md`
- `docs/02_architecture/repo_structure.md`
- `docs/02_architecture/impact_analysis_template.md`
- `docs/02_architecture/adr/`
- `docs/02_architecture/api/*.yaml`
- `projects/packages/api-contract/openapi.yaml`
- `projects/apps/api/src/generated/oas/routes.ts`

## 5. Rule Skills and Guardrails

- `.claude/skills/repo-conventions/SKILL.md`
- `.claude/skills/quality-gates/SKILL.md`
- `.claude/skills/ddd-clean-architecture/SKILL.md`
- `.claude/skills/fsd-frontend/SKILL.md`
- `.claude/skills/security-baseline/SKILL.md`
- `projects/packages/guardrails/src/guards/*.ts`

## 6. Contract Execution

- `tools/contract`
- `tools/_contract/stack/`
- `tools/worktree/`

## Update Rule Map

1. Run:
   ```bash
   .claude/skills/pr-review-governance/scripts/discover-review-rules.sh
   ```
2. Compare discovered files with this map.
3. If a stable rule source is newly added, append it here in the same PR.
