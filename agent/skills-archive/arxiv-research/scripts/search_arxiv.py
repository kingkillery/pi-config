#!/usr/bin/env python3
"""Small arXiv API search helper.

Prints compact paper records for fast review and deduplication.
"""

from __future__ import annotations

import argparse
import textwrap
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


API_URL = "https://export.arxiv.org/api/query"
NS = {"a": "http://www.w3.org/2005/Atom"}


def build_query(raw: str) -> str:
    raw = raw.strip()
    if ":" in raw or " AND " in raw or raw.startswith("all:"):
        return raw
    return "all:" + raw


def fetch(query: str, max_results: int, sort: str) -> bytes:
    sort_by = "submittedDate" if sort == "date" else "relevance"
    params = {
        "search_query": build_query(query),
        "max_results": str(max_results),
        "sortBy": sort_by,
        "sortOrder": "descending",
    }
    url = API_URL + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=30) as response:
        return response.read()


def compact(text: str | None) -> str:
    return " ".join((text or "").split())


def main() -> int:
    parser = argparse.ArgumentParser(description="Search arXiv and print compact records.")
    parser.add_argument("query", help="arXiv query or raw search phrase")
    parser.add_argument("--max", type=int, default=10, dest="max_results")
    parser.add_argument("--sort", choices=["relevance", "date"], default="relevance")
    parser.add_argument("--abstract-chars", type=int, default=360)
    args = parser.parse_args()

    root = ET.fromstring(fetch(args.query, args.max_results, args.sort))
    entries = root.findall("a:entry", NS)

    for entry in entries:
        arxiv_id = compact(entry.findtext("a:id", namespaces=NS)).split("/abs/")[-1]
        title = compact(entry.findtext("a:title", namespaces=NS))
        published = compact(entry.findtext("a:published", namespaces=NS))[:10]
        authors = ", ".join(
            compact(author.findtext("a:name", namespaces=NS))
            for author in entry.findall("a:author", NS)[:6]
        )
        summary = compact(entry.findtext("a:summary", namespaces=NS))
        if len(summary) > args.abstract_chars:
            summary = summary[: args.abstract_chars].rstrip() + "..."

        print(f"{arxiv_id} | {published} | {title}")
        print(f"Authors: {authors}")
        print(f"Link: https://arxiv.org/abs/{arxiv_id}")
        print(textwrap.fill(summary, width=100, subsequent_indent="  "))
        print()

    if not entries:
        print("No arXiv results.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
