#!/usr/bin/env python3
"""
Skill Initializer - Creates a new skill from template

Usage:
    init_skill.py <skill-name> --path <path>

Examples:
    init_skill.py my-new-skill --path .claude/skills
    init_skill.py my-api-helper --path .claude/skills
    init_skill.py custom-skill --path /custom/location

Based on: https://github.com/anthropics/skills (MIT License)
Local adaptations: frontmatter includes globs + alwaysApply, path traversal protection
"""

import re
import sys
from pathlib import Path


# Security: strict naming pattern
SKILL_NAME_PATTERN = re.compile(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$')
MAX_NAME_LENGTH = 64


SKILL_TEMPLATE = """---
name: {skill_name}
description: "[TODO: What this skill does. Apply when X. Triggers on \\"keyword1\\", \\"keyword2\\".]"
globs:
  - "[TODO: Add relevant file patterns]"
alwaysApply: false
---

# {skill_title}

## Overview

[TODO: 1-2 sentences explaining what this skill enables]

## Structuring This Skill

[TODO: Choose the structure that best fits this skill's purpose. Common patterns:

**1. Workflow-Based** (best for sequential processes)
- Structure: ## Overview -> ## Workflow Decision Tree -> ## Step 1 -> ## Step 2...

**2. Task-Based** (best for tool collections)
- Structure: ## Overview -> ## Quick Start -> ## Task Category 1 -> ## Task Category 2...

**3. Reference/Guidelines** (best for standards or specifications)
- Structure: ## Overview -> ## Guidelines -> ## Specifications -> ## Usage...

**4. Capabilities-Based** (best for integrated systems)
- Structure: ## Overview -> ## Core Capabilities -> ### 1. Feature -> ### 2. Feature...

Delete this entire "Structuring This Skill" section when done.]

## [TODO: Replace with the first main section based on chosen structure]

[TODO: Add content here.]

## Resources

This skill includes example resource directories:

### scripts/
Executable code (Python/Bash/etc.) for automation or specific operations.

### references/
Documentation and reference material loaded into context as needed.

### assets/
Files used in output (templates, images, fonts, etc.), not loaded into context.

---

**Delete unneeded directories.** Not every skill requires all three types of resources.
"""

EXAMPLE_SCRIPT = '''#!/usr/bin/env python3
"""
Example helper script for {skill_name}

Replace with actual implementation or delete if not needed.
"""

def main():
    print("This is an example script for {skill_name}")

if __name__ == "__main__":
    main()
'''

EXAMPLE_REFERENCE = """# Reference Documentation for {skill_title}

Replace with actual reference content or delete if not needed.

Reference docs are ideal for:
- Comprehensive API documentation
- Detailed workflow guides
- Complex multi-step processes
- Information too lengthy for main SKILL.md
"""

EXAMPLE_ASSET = """# Example Asset File

Replace with actual asset files (templates, images, fonts, etc.) or delete if not needed.

Asset files are NOT loaded into context but used within output Claude produces.
"""


def validate_skill_name(skill_name):
    """
    Validate skill name for safety and convention compliance.

    Returns:
        (bool, str): (is_valid, error_message)
    """
    if not skill_name:
        return False, "Skill name cannot be empty"

    if len(skill_name) > MAX_NAME_LENGTH:
        return False, f"Skill name too long ({len(skill_name)} chars). Maximum is {MAX_NAME_LENGTH}."

    # Security: reject path traversal attempts
    if '..' in skill_name or '/' in skill_name or '\\' in skill_name:
        return False, "Skill name must not contain path separators or '..'"

    # Security: reject absolute paths
    if skill_name.startswith('/') or skill_name.startswith('~'):
        return False, "Skill name must not be an absolute path"

    # Single character names are valid if alphanumeric
    if len(skill_name) == 1:
        if re.match(r'^[a-z0-9]$', skill_name):
            return True, ""
        return False, f"Single character name '{skill_name}' must be lowercase letter or digit"

    # Convention: kebab-case
    if not SKILL_NAME_PATTERN.match(skill_name):
        return False, (
            f"Name '{skill_name}' must be kebab-case "
            "(lowercase letters, digits, hyphens; cannot start/end with hyphen)"
        )

    if '--' in skill_name:
        return False, f"Name '{skill_name}' cannot contain consecutive hyphens"

    return True, ""


def title_case_skill_name(skill_name):
    """Convert hyphenated skill name to Title Case for display."""
    return ' '.join(word.capitalize() for word in skill_name.split('-'))


def init_skill(skill_name, path):
    """
    Initialize a new skill directory with template SKILL.md.

    Args:
        skill_name: Name of the skill
        path: Path where the skill directory should be created

    Returns:
        Path to created skill directory, or None if error
    """
    # Validate skill name
    valid, error = validate_skill_name(skill_name)
    if not valid:
        print(f"Error: {error}")
        return None

    # Determine skill directory path
    base_path = Path(path).resolve()
    skill_dir = base_path / skill_name

    # Security: ensure final path is within base_path
    try:
        skill_dir.resolve().relative_to(base_path)
    except ValueError:
        print(f"Error: Skill path would escape base directory: {skill_dir}")
        return None

    # Check if directory already exists
    if skill_dir.exists():
        print(f"Error: Skill directory already exists: {skill_dir}")
        return None

    # Create skill directory
    try:
        skill_dir.mkdir(parents=True, exist_ok=False)
        print(f"Created skill directory: {skill_dir}")
    except Exception as e:
        print(f"Error creating directory: {e}")
        return None

    # Create SKILL.md from template
    skill_title = title_case_skill_name(skill_name)
    skill_content = SKILL_TEMPLATE.format(
        skill_name=skill_name,
        skill_title=skill_title
    )

    skill_md_path = skill_dir / 'SKILL.md'
    try:
        skill_md_path.write_text(skill_content)
        print("Created SKILL.md")
    except Exception as e:
        print(f"Error creating SKILL.md: {e}")
        return None

    # Create resource directories with example files
    try:
        # Create scripts/ directory with example script
        scripts_dir = skill_dir / 'scripts'
        scripts_dir.mkdir(exist_ok=True)
        example_script = scripts_dir / 'example.py'
        example_script.write_text(EXAMPLE_SCRIPT.format(skill_name=skill_name))
        example_script.chmod(0o755)
        print("Created scripts/example.py")

        # Create references/ directory with example reference doc
        references_dir = skill_dir / 'references'
        references_dir.mkdir(exist_ok=True)
        example_reference = references_dir / 'api_reference.md'
        example_reference.write_text(EXAMPLE_REFERENCE.format(skill_title=skill_title))
        print("Created references/api_reference.md")

        # Create assets/ directory with example asset placeholder
        assets_dir = skill_dir / 'assets'
        assets_dir.mkdir(exist_ok=True)
        example_asset = assets_dir / 'example_asset.txt'
        example_asset.write_text(EXAMPLE_ASSET)
        print("Created assets/example_asset.txt")
    except Exception as e:
        print(f"Error creating resource directories: {e}")
        return None

    # Print next steps
    print(f"\nSkill '{skill_name}' initialized successfully at {skill_dir}")
    print("\nNext steps:")
    print("1. Edit SKILL.md to complete the TODO items and update the description")
    print("2. Customize or delete the example files in scripts/, references/, and assets/")
    print("3. Run the validator when ready to check the skill structure")

    return skill_dir


def main():
    if len(sys.argv) < 4 or sys.argv[2] != '--path':
        print("Usage: init_skill.py <skill-name> --path <path>")
        print("\nSkill name requirements:")
        print("  - Kebab-case identifier (e.g., 'my-data-analyzer')")
        print("  - Lowercase letters, digits, and hyphens only")
        print("  - Max 64 characters")
        print("  - Must match directory name exactly")
        print("\nExamples:")
        print("  init_skill.py my-new-skill --path .claude/skills")
        print("  init_skill.py my-api-helper --path .claude/skills")
        sys.exit(1)

    skill_name = sys.argv[1]
    path = sys.argv[3]

    print(f"Initializing skill: {skill_name}")
    print(f"   Location: {path}")
    print()

    result = init_skill(skill_name, path)

    if result:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
