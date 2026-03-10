#!/usr/bin/env python3
"""
UX Psychology Pack Integrity Checker

catalog.json と sources/ の整合性をチェックするローカル用ツール。

Usage:
    python check_pack_integrity.py [OPTIONS]

Options:
    --help        このヘルプメッセージを表示
    --base DIR    パックのルートディレクトリ（デフォルト: 自動検出）
    --verbose     詳細出力を有効化

Checks:
    1. catalog.json の存在と構造
    2. catalog の各 concept に対応する text ファイルの存在
    3. sources/meta/ と catalog.json の概念数の一致
    4. content_hash の整合性（raw ファイルが存在する場合）
    5. 必須ディレクトリ・ファイルの存在
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path


REQUIRED_DIRS = [
    "scripts",
    "templates",
    "docs",
    "ci",
    "prompts",
    "sources",
    "rules",
]

REQUIRED_FILES = [
    "README.md",
    "scripts/crawl_shokasonjuku_ux_psychology.py",
    "scripts/build_catalog.py",
    "templates/ux-psychology-impact-assessment.md",
    "templates/ux-psychology-pr-checklist.md",
    "templates/ux-psychology-acceptance-criteria.md",
    "docs/process.md",
    "docs/governance.md",
    "ci/check_pack_integrity.py",
]


def parse_args():
    parser = argparse.ArgumentParser(
        description="UX Psychology Pack Integrity Checker",
    )
    parser.add_argument(
        "--base",
        type=str,
        default=None,
        help="パックのルートディレクトリ（デフォルト: 自動検出）",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="詳細出力を有効化",
    )
    return parser.parse_args()


def get_base_dir(custom_dir: str | None) -> Path:
    if custom_dir:
        return Path(custom_dir)
    return Path(__file__).resolve().parent.parent


def check_directories(base: Path, verbose: bool) -> list[str]:
    """必須ディレクトリの存在チェック。"""
    errors = []
    for d in REQUIRED_DIRS:
        path = base / d
        if not path.is_dir():
            errors.append(f"Missing directory: {d}/")
        elif verbose:
            print(f"  OK: {d}/")
    return errors


def check_files(base: Path, verbose: bool) -> list[str]:
    """必須ファイルの存在チェック。"""
    errors = []
    for f in REQUIRED_FILES:
        path = base / f
        if not path.is_file():
            errors.append(f"Missing file: {f}")
        elif verbose:
            print(f"  OK: {f}")
    return errors


def check_catalog(base: Path, verbose: bool) -> list[str]:
    """catalog.json の構造と整合性チェック。"""
    catalog_path = base / "rules" / "catalog.json"
    errors = []

    if not catalog_path.exists():
        # catalog.json is optional if crawl hasn't been run yet
        if verbose:
            print("  SKIP: rules/catalog.json not found (crawl not executed yet)")
        return []

    try:
        with open(catalog_path, encoding="utf-8") as f:
            catalog = json.load(f)
    except json.JSONDecodeError as e:
        return [f"catalog.json is invalid JSON: {e}"]

    # Structure check
    for field in ["version", "generated_at", "source_url", "concepts"]:
        if field not in catalog:
            errors.append(f"catalog.json: missing field '{field}'")

    if "concepts" not in catalog:
        return errors

    concepts = catalog["concepts"]
    if verbose:
        print(f"  Catalog has {len(concepts)} concepts")

    # Check each concept's local file
    for concept in concepts:
        slug = concept.get("slug", "unknown")
        text_path = base / "sources" / "text" / f"{slug}.txt"
        if not text_path.exists():
            errors.append(f"Concept '{slug}': text file not found: {text_path.name}")

        # Hash check if raw file exists
        raw_path = base / "sources" / "raw" / f"{slug}.html"
        if raw_path.exists() and concept.get("content_hash"):
            actual_hash = hashlib.sha256(
                raw_path.read_bytes()
            ).hexdigest()
            if actual_hash != concept["content_hash"]:
                errors.append(
                    f"Concept '{slug}': hash mismatch "
                    f"(expected: {concept['content_hash'][:12]}..., "
                    f"actual: {actual_hash[:12]}...)"
                )
            elif verbose:
                print(f"  OK: {slug} hash verified")

    # Cross-check with meta files
    meta_dir = base / "sources" / "meta"
    if meta_dir.exists():
        meta_count = len(list(meta_dir.glob("*.json")))
        if meta_count != len(concepts):
            errors.append(
                f"Meta/catalog count mismatch: "
                f"{meta_count} meta files vs {len(concepts)} catalog entries"
            )

    return errors


def main():
    args = parse_args()
    base = get_base_dir(args.base)

    print(f"UX Psychology Pack Integrity Check")
    print(f"Base directory: {base}")
    print()

    all_errors = []

    # 1. Directory check
    print("[1/3] Checking directories...")
    errors = check_directories(base, args.verbose)
    all_errors.extend(errors)
    for e in errors:
        print(f"  FAIL: {e}")

    # 2. File check
    print("[2/3] Checking required files...")
    errors = check_files(base, args.verbose)
    all_errors.extend(errors)
    for e in errors:
        print(f"  FAIL: {e}")

    # 3. Catalog check
    print("[3/3] Checking catalog integrity...")
    errors = check_catalog(base, args.verbose)
    all_errors.extend(errors)
    for e in errors:
        print(f"  FAIL: {e}")

    # Summary
    print()
    if all_errors:
        print(f"FAILED: {len(all_errors)} error(s) found.")
        sys.exit(1)
    else:
        print("PASSED: All checks passed.")
        sys.exit(0)


if __name__ == "__main__":
    main()
