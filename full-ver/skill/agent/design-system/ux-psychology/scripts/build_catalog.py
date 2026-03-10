#!/usr/bin/env python3
"""
UX Psychology Catalog Builder

sources/meta/ のメタデータから rules/catalog.json を生成する。

Usage:
    python build_catalog.py [OPTIONS]

Options:
    --help           このヘルプメッセージを表示
    --sources DIR    ソースディレクトリ（デフォルト: ../sources）
    --output FILE    出力ファイル（デフォルト: ../rules/catalog.json）
    --validate       生成せずに既存の catalog.json を検証のみ実行

Output:
    rules/catalog.json - 概念カタログ
        {
          "version": "1.0",
          "generated_at": "ISO8601",
          "source_url": "https://...",
          "concepts": [
            {
              "id": 1,
              "slug": "aesthetic-usability-effect",
              "title": "美的ユーザビリティ効果",
              "url": "https://...",
              "local_path": "sources/text/aesthetic-usability-effect.txt",
              "content_hash": "sha256..."
            }
          ]
        }
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


SOURCE_URL = "https://www.shokasonjuku.com/ux-psychology"


def parse_args():
    parser = argparse.ArgumentParser(
        description="UX Psychology Catalog Builder",
    )
    parser.add_argument(
        "--sources",
        type=str,
        default=None,
        help="ソースディレクトリ（デフォルト: ../sources）",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="出力ファイル（デフォルト: ../rules/catalog.json）",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="生成せずに既存の catalog.json を検証のみ実行",
    )
    return parser.parse_args()


def get_default_paths() -> tuple[Path, Path]:
    script_dir = Path(__file__).resolve().parent
    base = script_dir.parent
    return base / "sources", base / "rules" / "catalog.json"


def load_meta_files(sources_dir: Path) -> list[dict]:
    """sources/meta/ からメタデータファイルを読み込む。"""
    meta_dir = sources_dir / "meta"
    if not meta_dir.exists():
        print(f"Error: Meta directory not found: {meta_dir}", file=sys.stderr)
        print("Run crawl_shokasonjuku_ux_psychology.py first.", file=sys.stderr)
        sys.exit(1)

    metas = []
    for meta_file in sorted(meta_dir.glob("*.json")):
        with open(meta_file, encoding="utf-8") as f:
            metas.append(json.load(f))

    return metas


def build_catalog(metas: list[dict]) -> dict:
    """メタデータから catalog.json 構造を生成する。"""
    concepts = []
    for i, meta in enumerate(sorted(metas, key=lambda m: m["slug"]), 1):
        concepts.append(
            {
                "id": i,
                "slug": meta["slug"],
                "title": meta["title"],
                "url": meta["url"],
                "local_path": meta.get("text_path", f"sources/text/{meta['slug']}.txt"),
                "content_hash": meta.get("content_hash", ""),
            }
        )

    return {
        "version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_url": SOURCE_URL,
        "concept_count": len(concepts),
        "concepts": concepts,
    }


def validate_catalog(catalog_path: Path, sources_dir: Path) -> bool:
    """既存の catalog.json を検証する。"""
    if not catalog_path.exists():
        print(f"Error: Catalog not found: {catalog_path}", file=sys.stderr)
        return False

    with open(catalog_path, encoding="utf-8") as f:
        catalog = json.load(f)

    errors = []

    # Check required fields
    for field in ["version", "generated_at", "source_url", "concepts"]:
        if field not in catalog:
            errors.append(f"Missing required field: {field}")

    if "concepts" not in catalog:
        for e in errors:
            print(f"  ERROR: {e}", file=sys.stderr)
        return False

    # Check each concept
    for concept in catalog["concepts"]:
        for field in ["id", "slug", "title", "url", "local_path", "content_hash"]:
            if field not in concept:
                errors.append(f"Concept '{concept.get('slug', '?')}': missing field '{field}'")

        # Check local file exists
        local_path = sources_dir.parent / concept.get("local_path", "")
        if not local_path.exists():
            errors.append(f"Concept '{concept['slug']}': local file not found: {local_path}")

    if errors:
        print(f"Validation FAILED ({len(errors)} errors):")
        for e in errors:
            print(f"  ERROR: {e}", file=sys.stderr)
        return False

    print(f"Validation PASSED: {len(catalog['concepts'])} concepts verified.")
    return True


def main():
    args = parse_args()
    default_sources, default_output = get_default_paths()

    sources_dir = Path(args.sources) if args.sources else default_sources
    output_path = Path(args.output) if args.output else default_output

    # Validate mode
    if args.validate:
        ok = validate_catalog(output_path, sources_dir)
        sys.exit(0 if ok else 1)

    # Build catalog
    print(f"Loading metadata from {sources_dir / 'meta'}...")
    metas = load_meta_files(sources_dir)
    print(f"Found {len(metas)} concept metadata files.")

    if not metas:
        print("No metadata found. Run the crawler first.", file=sys.stderr)
        sys.exit(1)

    catalog = build_catalog(metas)

    # Write output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    print(f"Catalog written to {output_path}")
    print(f"  Version: {catalog['version']}")
    print(f"  Concepts: {catalog['concept_count']}")
    print(f"  Generated: {catalog['generated_at']}")


if __name__ == "__main__":
    main()
