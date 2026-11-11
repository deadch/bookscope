from __future__ import annotations

import argparse

from .i18n import t
from .providers import load_sources, search


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="bookscope",
        description="Federated terminal search for books and digital catalogs.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    search_cmd = sub.add_parser("search", help="Search books across configured providers.")
    search_cmd.add_argument("query")
    search_cmd.add_argument("--lang", choices=["pt", "en"], default="pt")
    search_cmd.add_argument("--limit", type=int, default=5)
    search_cmd.add_argument(
        "--source",
        choices=["openlibrary", "googlebooks", "archive"],
        default=None,
    )

    sources_cmd = sub.add_parser("sources", help="List configured source categories.")
    sources_cmd.add_argument("--lang", choices=["pt", "en"], default="pt")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "sources":
        print(t(args.lang, "sources"))
        for source in load_sources():
            print(f"- {source['name']} [{source['type']}] — {source['url']}")
        return

    print(f"{t(args.lang, 'searching')}: {args.query}")
    results = search(args.query, args.lang, args.limit, args.source)

    if not results:
        print(t(args.lang, "no_results"))
        return

    for index, result in enumerate(results, start=1):
        print(f"\n{index}. {result.display()}")
