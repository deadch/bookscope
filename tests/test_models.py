from bookscope.models import BookResult


def test_display_contains_title_and_source():
    result = BookResult(
        title="Test Book",
        authors=["Author"],
        source="Test",
        url="https://example.org/book",
    )
    text = result.display()
    assert "Test Book" in text
    assert "[Test]" in text
    assert "https://example.org/book" in text
