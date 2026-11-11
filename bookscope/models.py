from dataclasses import dataclass, field


@dataclass(slots=True)
class BookResult:
    title: str
    authors: list[str] = field(default_factory=list)
    year: str | None = None
    language: str | None = None
    source: str = ""
    source_type: str = "catalog"
    url: str = ""
    identifier: str | None = None
    access: str | None = None

    def display(self) -> str:
        authors = ", ".join(self.authors) if self.authors else "—"
        parts = [self.title, authors]
        if self.year:
            parts.append(self.year)
        parts.append(f"[{self.source}]")
        return " — ".join(parts) + f"\n  {self.url}"
