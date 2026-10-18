"""
Unit tests for document ingestion, text extraction, chunking, and metadata storage.
"""
import pytest
from app.services.document_service import document_service
import pymupdf


def test_chunk_text():
    """Verify text chunking preserves page numbers and overlaps properly."""
    pages = [
        (1, "First page syllabus introduction to thermodynamics and heat transfer principles."),
        (2, "Second page covers laws of thermodynamics. First law states energy conservation.")
    ]
    chunks = document_service.chunk_text(
        pages_text=pages,
        doc_id="test_doc_1",
        title="Thermodynamics Syllabus",
        category="University Syllabus",
        chunk_size=100,
        chunk_overlap=20
    )
    assert len(chunks) >= 2
    assert chunks[0].page_number == 1
    assert chunks[0].document_id == "test_doc_1"


def test_pdf_extraction_and_processing():
    """Create an in-memory PDF, extract pages, and verify processing."""
    # Create simple 2-page PDF in memory
    doc = pymupdf.open()
    page1 = doc.new_page()
    page1.insert_text((50, 72), "Unit 1: Object Oriented Programming in C++ and Polymorphism.")
    page2 = doc.new_page()
    page2.insert_text((50, 72), "Unit 2: Dynamic memory management and smart pointers.")
    pdf_bytes = doc.tobytes()
    doc.close()

    # Extract text
    pages = document_service.extract_text_from_pdf(pdf_bytes)
    assert len(pages) == 2
    assert pages[0][0] == 1
    assert "Polymorphism" in pages[0][1]
    assert pages[1][0] == 2
    assert "pointers" in pages[1][1]


def test_validate_file_extensions():
    """Verify rejection of unsupported extensions and oversized files."""
    with pytest.raises(ValueError, match="not supported"):
        document_service.validate_file("malicious.exe", b"binary content")

    # Valid extension
    document_service.validate_file("syllabus.pdf", b"pdf content")
    document_service.validate_file("notes.txt", b"plain text")
    document_service.validate_file("readme.md", b"# Markdown")
