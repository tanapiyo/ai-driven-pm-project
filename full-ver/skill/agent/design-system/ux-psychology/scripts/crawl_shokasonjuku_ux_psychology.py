#!/usr/bin/env python3
"""
ShokaSonjuku UX Psychology Crawler

ソースサイト（shokasonjuku.com/ux-psychology）から UX心理学の概念ページを取得し、
ローカルに保存する。

Usage:
    python crawl_shokasonjuku_ux_psychology.py [OPTIONS]

Options:
    --help          このヘルプメッセージを表示
    --dry-run       実際のリクエストを送信せずに対象URLを表示
    --delay SECONDS リクエスト間隔（デフォルト: 2秒）
    --output DIR    出力ディレクトリ（デフォルト: ../sources）
    --check-robots  robots.txt を確認して表示（クロールは実行しない）

Output:
    sources/raw/   - 生HTML
    sources/text/  - 抽出テキスト
    sources/meta/  - メタデータ（URL, タイトル, 取得日時）

Legal:
    実行前に必ず robots.txt と利用規約を確認すること。
    取得コンテンツは社内の設計判断参照用途のみに使用し、再配布しないこと。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

BASE_URL = "https://www.shokasonjuku.com"
INDEX_PATH = "/ux-psychology"
USER_AGENT = "UXPsychologyPack/1.0 (internal-use-only)"
DEFAULT_DELAY = 2


def parse_args():
    parser = argparse.ArgumentParser(
        description="ShokaSonjuku UX Psychology Crawler",
        epilog="Legal: 実行前に必ず robots.txt と利用規約を確認すること。",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="実際のリクエストを送信せずに対象URLを表示",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=DEFAULT_DELAY,
        help=f"リクエスト間隔（秒）（デフォルト: {DEFAULT_DELAY}）",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="出力ディレクトリ（デフォルト: ../sources）",
    )
    parser.add_argument(
        "--check-robots",
        action="store_true",
        help="robots.txt を確認して表示（クロールは実行しない）",
    )
    return parser.parse_args()


def ensure_deps():
    """Import required packages or exit with install instructions."""
    try:
        import requests  # noqa: F401
        from bs4 import BeautifulSoup  # noqa: F401
    except ImportError:
        print("Error: Required packages not found.", file=sys.stderr)
        print("Install with: pip install requests beautifulsoup4", file=sys.stderr)
        sys.exit(1)


def get_output_dir(custom_dir: "str | None") -> Path:
    if custom_dir:
        return Path(custom_dir)
    script_dir = Path(__file__).resolve().parent
    return script_dir.parent / "sources"


def check_robots_txt(session) -> str:
    """robots.txt を取得して内容を返す。"""
    import requests

    url = f"{BASE_URL}/robots.txt"
    try:
        resp = session.get(url, timeout=10)
        if resp.status_code == 404:
            return f"robots.txt not found (404) at {url}\n(No explicit crawl restrictions)"
        resp.raise_for_status()
        return f"robots.txt content from {url}:\n\n{resp.text}"
    except requests.RequestException as e:
        return f"Error fetching robots.txt: {e}"


def fetch_concept_urls(session) -> "list[dict]":
    """インデックスページから概念のURLリストを取得する。"""
    from bs4 import BeautifulSoup

    url = f"{BASE_URL}{INDEX_PATH}"
    resp = session.get(url, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    concepts = []

    for link in soup.find_all("a", href=True):
        href = link["href"]
        if "/ux-psychology/" in href and href != INDEX_PATH:
            full_url = urljoin(BASE_URL, href)
            slug = href.rstrip("/").split("/")[-1]
            title = link.get_text(strip=True) or slug
            if slug and not any(c["slug"] == slug for c in concepts):
                concepts.append(
                    {
                        "url": full_url,
                        "slug": slug,
                        "title": title,
                    }
                )

    return concepts


def extract_text(html: str) -> str:
    """HTMLからメインコンテンツのテキストを抽出する。"""
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")

    for tag in soup.find_all(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    main = soup.find("main") or soup.find("article") or soup.find(
        "div", class_=re.compile(r"content|main|article", re.I)
    )
    target = main if main else soup.body or soup

    text = target.get_text(separator="\n", strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def crawl_concept(session, concept: dict, output_dir: Path) -> dict:
    """1つの概念ページをクロールし、保存する。"""
    slug = concept["slug"]
    url = concept["url"]

    resp = session.get(url, timeout=30)
    resp.raise_for_status()
    html = resp.text

    raw_dir = output_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    (raw_dir / f"{slug}.html").write_text(html, encoding="utf-8")

    text = extract_text(html)
    text_dir = output_dir / "text"
    text_dir.mkdir(parents=True, exist_ok=True)
    (text_dir / f"{slug}.txt").write_text(text, encoding="utf-8")

    content_hash = hashlib.sha256(html.encode("utf-8")).hexdigest()
    meta = {
        "slug": slug,
        "title": concept["title"],
        "url": url,
        "crawled_at": datetime.now(timezone.utc).isoformat(),
        "content_hash": content_hash,
        "raw_path": f"sources/raw/{slug}.html",
        "text_path": f"sources/text/{slug}.txt",
    }
    meta_dir = output_dir / "meta"
    meta_dir.mkdir(parents=True, exist_ok=True)
    (meta_dir / f"{slug}.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    return meta


def main():
    args = parse_args()

    # Check dependencies after argparse (so --help works without packages)
    ensure_deps()

    import requests

    output_dir = get_output_dir(args.output)

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    if args.check_robots:
        print(check_robots_txt(session))
        return

    print(f"Fetching concept list from {BASE_URL}{INDEX_PATH}...")
    concepts = fetch_concept_urls(session)
    print(f"Found {len(concepts)} concepts.")

    if not concepts:
        print("No concepts found. Exiting.", file=sys.stderr)
        sys.exit(1)

    if args.dry_run:
        print("\n[DRY RUN] Target URLs:")
        for i, c in enumerate(concepts, 1):
            print(f"  {i:3d}. {c['title']} -> {c['url']}")
        print(f"\nOutput directory: {output_dir}")
        return

    print(f"Output directory: {output_dir}")
    print(f"Request delay: {args.delay}s\n")

    results = []
    for i, concept in enumerate(concepts, 1):
        print(f"[{i}/{len(concepts)}] Crawling: {concept['title']} ({concept['slug']})...")
        try:
            meta = crawl_concept(session, concept, output_dir)
            results.append(meta)
            print(f"  -> Saved (hash: {meta['content_hash'][:12]}...)")
        except requests.RequestException as e:
            print(f"  -> ERROR: {e}", file=sys.stderr)
            results.append({"slug": concept["slug"], "error": str(e)})

        if i < len(concepts):
            time.sleep(args.delay)

    success = sum(1 for r in results if "error" not in r)
    errors = sum(1 for r in results if "error" in r)
    print(f"\nDone: {success} succeeded, {errors} failed out of {len(concepts)} concepts.")

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
