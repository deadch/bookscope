from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path

from .models import BookResult


ROOT = Path(__file__).resolve().parent.parent
SOURCES_FILE = ROOT / "data" / "sources.json"


def http_json(url: str) -> dict:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "BookScope/0.1 (+terminal book search)",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def load_sources() -> list[dict]:
    return json.loads(SOURCES_FILE.read_text(encoding="utf-8"))


def search_openlibrary(query: str, lang: str, limit: int) -> list[BookResult]:
    params = {
        "q": query,
        "limit": min(limit, 100),
        "lang": lang,
    }
    url = "https://openlibrary.org/search.json?" + urllib.parse.urlencode(params)
    data = http_json(url)

    results = []
    for item in data.get("docs", [])[:limit]:
        key = item.get("key", "")
        results.append(
            BookResult(
                title=item.get("title", "Untitled"),
                authors=item.get("author_name", []),
                year=str(item.get("first_publish_year")) if item.get("first_publish_year") else None,
                language=(item.get("language") or [None])[0],
                source="Open Library",
                source_type="official",
                url=f"https://openlibrary.org{key}" if key else "https://openlibrary.org/",
                identifier=key or None,
                access="catalog/search",
            )
        )
    return results


def search_google_books(query: str, lang: str, limit: int) -> list[BookResult]:
    params = {
        "q": query,
        "maxResults": min(limit, 40),
        "printType": "books",
    }
    if lang in {"pt", "en"}:
        params["langRestrict"] = lang

    url = "https://www.googleapis.com/books/v1/volumes?" + urllib.parse.urlencode(params)
    data = http_json(url)

    results = []
    for item in data.get("items", [])[:limit]:
        info = item.get("volumeInfo", {})
        access = item.get("accessInfo", {})
        results.append(
            BookResult(
                title=info.get("title", "Untitled"),
                authors=info.get("authors", []),
                year=str(info.get("publishedDate", ""))[:4] or None,
                language=info.get("language"),
                source="Google Books",
                source_type="catalog",
                url=info.get("infoLink") or f"https://books.google.com/books?id={item.get('id', '')}",
                identifier=item.get("id"),
                access=access.get("viewability"),
            )
        )
    return results


def search_internet_archive(query: str, lang: str, limit: int) -> list[BookResult]:
    ia_query = f'(title:({query}) OR creator:({query}) OR subject:({query})) AND mediatype:texts'
    params = {
        "q": ia_query,
        "fl[]": ["identifier", "title", "creator", "year"],
        "rows": min(limit, 50),
        "page": 1,
        "output": "json",
    }
    # urllib.urlencode needs doseq for repeated fl[] fields.
    url = "https://archive.org/advancedsearch.php?" + urllib.parse.urlencode(params, doseq=True)
    data = http_json(url)

    results = []
    for item in data.get("response", {}).get("docs", [])[:limit]:
        identifier = item.get("identifier")
        creators = item.get("creator", [])
        if isinstance(creators, str):
            creators = [creators]
        results.append(
            BookResult(
                title=item.get("title", "Untitled"),
                authors=creators,
                year=str(item.get("year")) if item.get("year") else None,
                source="Internet Archive",
                source_type="archive",
                url=f"https://archive.org/details/{identifier}" if identifier else "https://archive.org/",
                identifier=identifier,
                access="archive item",
            )
        )
    return results


PROVIDERS = {
    "openlibrary": search_openlibrary,
    "googlebooks": search_google_books,
    "archive": search_internet_archive,
}


def search(query: str, lang: str, limit: int, source: str | None = None) -> list[BookResult]:
    names = [source] if source else list(PROVIDERS)
    results: list[BookResult] = []

    for name in names:
        provider = PROVIDERS.get(name)
        if not provider:
            continue
        try:
            results.extend(provider(query, lang, limit))
        except Exception as exc:
            # A failed provider must not prevent the remaining providers
            # from returning results.
            print(f"[{name}] provider error: {exc}")

    return deduplicate(results)


def deduplicate(results: list[BookResult]) -> list[BookResult]:
    seen: set[tuple[str, str]] = set()
    output = []

    for item in results:
        key = (
            item.title.casefold().strip(),
            "|".join(a.casefold().strip() for a in item.authors),
        )
        if key in seen:
            continue
        seen.add(key)
        output.append(item)

    return output
