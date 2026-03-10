#!/usr/bin/env python3
"""
Quick validation script for skills - validates SKILL.md structure and frontmatter.

Usage:
    quick_validate.py <skill_directory>

Based on: https://github.com/anthropics/skills (MIT License)
Local adaptations: globs + alwaysApply in ALLOWED_PROPERTIES, YAML size limit
"""

import re
import sys
import yaml
from pathlib import Path

# Local extension: globs and alwaysApply added to allowed properties
ALLOWED_PROPERTIES = {
    'name', 'description', 'license', 'allowed-tools',
    'metadata', 'compatibility',
    'globs', 'alwaysApply',
}

# Security: max frontmatter size to prevent YAML bombs
MAX_FRONTMATTER_SIZE = 10240  # 10KB


def validate_skill(skill_path):
    """
    Validate a skill directory.

    Args:
        skill_path: Path to the skill directory

    Returns:
        (bool, str): (is_valid, message)
    """
    skill_path = Path(skill_path)

    # Check SKILL.md exists
    skill_md = skill_path / 'SKILL.md'
    if not skill_md.exists():
        return False, "SKILL.md not found"

    # Read and validate frontmatter
    content = skill_md.read_text()
    if not content.startswith('---'):
        return False, "No YAML frontmatter found"

    # Extract frontmatter
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return False, "Invalid frontmatter format"

    frontmatter_text = match.group(1)

    # Security: check frontmatter size before parsing
    if len(frontmatter_text.encode('utf-8')) > MAX_FRONTMATTER_SIZE:
        return False, f"Frontmatter too large ({len(frontmatter_text.encode('utf-8'))} bytes). Maximum is {MAX_FRONTMATTER_SIZE} bytes."

    # Parse YAML frontmatter
    try:
        frontmatter = yaml.safe_load(frontmatter_text)
        if not isinstance(frontmatter, dict):
            return False, "Frontmatter must be a YAML dictionary"
    except yaml.YAMLError as e:
        return False, f"Invalid YAML in frontmatter: {e}"

    # Check for unexpected properties
    unexpected_keys = set(frontmatter.keys()) - ALLOWED_PROPERTIES
    if unexpected_keys:
        return False, (
            f"Unexpected key(s) in SKILL.md frontmatter: {', '.join(sorted(unexpected_keys))}. "
            f"Allowed properties are: {', '.join(sorted(ALLOWED_PROPERTIES))}"
        )

    # Check required fields
    if 'name' not in frontmatter:
        return False, "Missing 'name' in frontmatter"
    if 'description' not in frontmatter:
        return False, "Missing 'description' in frontmatter"

    # Validate name
    name = frontmatter.get('name', '')
    if not isinstance(name, str):
        return False, f"Name must be a string, got {type(name).__name__}"
    name = name.strip()
    if name:
        if not re.match(r'^[a-z0-9-]+$', name):
            return False, f"Name '{name}' should be kebab-case (lowercase letters, digits, and hyphens only)"
        if name.startswith('-') or name.endswith('-') or '--' in name:
            return False, f"Name '{name}' cannot start/end with hyphen or contain consecutive hyphens"
        if len(name) > 64:
            return False, f"Name is too long ({len(name)} characters). Maximum is 64 characters."

    # Validate description
    description = frontmatter.get('description', '')
    if not isinstance(description, str):
        return False, f"Description must be a string, got {type(description).__name__}"
    description = description.strip()
    if description:
        if '<' in description or '>' in description:
            return False, "Description cannot contain angle brackets (< or >)"
        if len(description) > 1024:
            return False, f"Description is too long ({len(description)} characters). Maximum is 1024 characters."

    # Validate compatibility field if present
    compatibility = frontmatter.get('compatibility', '')
    if compatibility:
        if not isinstance(compatibility, str):
            return False, f"Compatibility must be a string, got {type(compatibility).__name__}"
        if len(compatibility) > 500:
            return False, f"Compatibility is too long ({len(compatibility)} characters). Maximum is 500 characters."

    # Local extension: validate globs field if present
    globs = frontmatter.get('globs')
    if globs is not None:
        if not isinstance(globs, list):
            return False, f"'globs' must be a list, got {type(globs).__name__}"
        for i, glob_pattern in enumerate(globs):
            if not isinstance(glob_pattern, str):
                return False, f"'globs[{i}]' must be a string, got {type(glob_pattern).__name__}"

    # Local extension: validate alwaysApply field if present
    always_apply = frontmatter.get('alwaysApply')
    if always_apply is not None:
        if not isinstance(always_apply, bool):
            return False, f"'alwaysApply' must be a boolean, got {type(always_apply).__name__}"

    return True, "Skill is valid!"


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python quick_validate.py <skill_directory>")
        sys.exit(1)

    valid, message = validate_skill(sys.argv[1])
    print(message)
    sys.exit(0 if valid else 1)
