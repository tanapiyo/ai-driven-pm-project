---
name: skill-creator
description: Guide for creating effective Claude Code skills. Use when creating a new skill, updating an existing skill, or reviewing skill structure. Triggers on "create skill", "new skill", "skill template", "init skill", "skill-creator".
globs:
  - ".claude/skills/**"
alwaysApply: false
---

# Skill Creator

Guide for creating effective skills that extend Claude's capabilities with specialized knowledge, workflows, or tool integrations.

## About Skills

Skills are modular, self-contained packages providing specialized knowledge, workflows, and tools. They transform Claude from a general-purpose agent into a specialized agent equipped with procedural knowledge.

### What Skills Provide

1. Specialized workflows - Multi-step procedures for specific domains
2. Tool integrations - Instructions for working with specific file formats or APIs
3. Domain expertise - Company-specific knowledge, schemas, business logic
4. Bundled resources - Scripts, references, and assets for complex and repetitive tasks

## Core Principles

### Concise is Key

The context window is a public good. Only add context Claude doesn't already have. Challenge each piece of information: "Does Claude really need this explanation?" and "Does this paragraph justify its token cost?"

Prefer concise examples over verbose explanations.

### Set Appropriate Degrees of Freedom

Match the level of specificity to the task's fragility and variability:

- **High freedom (text-based instructions)**: Multiple approaches valid, decisions depend on context
- **Medium freedom (pseudocode or scripts with parameters)**: Preferred pattern exists, some variation acceptable
- **Low freedom (specific scripts, few parameters)**: Operations fragile, consistency critical

### Anatomy of a Skill

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   ├── description: (required)
│   │   ├── globs: (required, local convention)
│   │   └── alwaysApply: (required, local convention)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code (Python/Bash/etc.)
    ├── references/       - Documentation loaded into context as needed
    └── assets/           - Files used in output (templates, icons, fonts, etc.)
```

#### SKILL.md Frontmatter

Every SKILL.md frontmatter MUST include these fields:

- **name** (required): Kebab-case identifier matching directory name
- **description** (required): What the skill does AND when to use it. Include trigger keywords at end.
- **globs** (required, local convention): File patterns that indicate when this skill should be injected
- **alwaysApply** (required, local convention): Boolean, typically `false` for on-demand skills

Example frontmatter:

```yaml
---
name: my-skill
description: What it does. Apply when X. Triggers on "keyword1", "keyword2".
globs:
  - "relevant/path/**"
  - "**/*pattern*"
alwaysApply: false
---
```

> **Note:** Anthropic's official spec uses only `name` and `description`. This repository adds `globs` and `alwaysApply` as required local conventions for Claude Code integration.

#### Bundled Resources (optional)

- **scripts/**: Executable code for tasks requiring deterministic reliability
- **references/**: Documentation loaded as needed into context (keeps SKILL.md lean)
- **assets/**: Files used in output, not loaded into context (templates, images, fonts)

#### What NOT to Include

Do NOT create: README.md, INSTALLATION_GUIDE.md, QUICK_REFERENCE.md, CHANGELOG.md, etc.

### Progressive Disclosure

Skills use three-level loading:

1. **Metadata (name + description)** - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words, <500 lines)
3. **Bundled resources** - As needed (unlimited)

When approaching 500 lines, split content into reference files. Reference them clearly from SKILL.md.

## Skill Creation Process

1. Understand the skill with concrete examples
2. Plan reusable skill contents (scripts, references, assets)
3. Initialize the skill (run init_skill.py)
4. Edit the skill (implement resources and write SKILL.md)
5. Package the skill (run package_skill.py)
6. Iterate based on real usage

### Step 1: Understanding with Concrete Examples

Clearly understand how the skill will be used. Ask:

- "What functionality should this skill support?"
- "Can you give examples of how it would be used?"
- "What would a user say that should trigger this skill?"

### Step 2: Planning Reusable Contents

Analyze each example to identify what scripts, references, and assets would be helpful.

### Step 3: Initializing the Skill

Run the init script to generate template:

```bash
python3 .claude/skills/skill-creator/scripts/init_skill.py <skill-name> --path .claude/skills
```

The script creates a skill directory with SKILL.md template (including local frontmatter), plus example `scripts/`, `references/`, and `assets/` directories.

### Step 4: Edit the Skill

#### Learn Proven Design Patterns

- **Multi-step processes**: See `references/workflows.md`
- **Output formats/quality standards**: See `references/output-patterns.md`

#### Start with Reusable Skill Contents

Implement scripts, references, and assets first. Test scripts by running them. Delete example files not needed.

#### Update SKILL.md

**Frontmatter**: Write `name`, `description` (with trigger keywords), `globs`, and `alwaysApply`.

**Body**: Write instructions using imperative/infinitive form. Keep under 500 lines.

### Step 5: Packaging a Skill

```bash
python3 .claude/skills/skill-creator/scripts/package_skill.py <path/to/skill-folder>
```

Validates then creates a `.skill` zip file for distribution.

### Step 6: Iterate

Use the skill on real tasks, notice struggles, update SKILL.md or resources, test again.

## Validation

Validate any skill structure:

```bash
python3 .claude/skills/skill-creator/scripts/quick_validate.py <path/to/skill-folder>
```

Checks: frontmatter format, required fields, naming conventions, description quality, local fields (`globs`, `alwaysApply`).

## See Also

- Based on [Anthropic skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) (MIT License)
- Local conventions: `.claude/rules/01-core.md`, `AGENTS.md`
