"""
Unit tests for vector indexing, semantic search, filtering, and attribution.
"""
from app.services.retrieval_service import retrieval_service
from app.services.document_service import DocumentChunk


def test_retrieval_indexing_and_search():
    """Verify adding chunks to index and retrieving top matches with filters."""
    chunks = [
        DocumentChunk(
            chunk_id="c1",
            document_id="doc_os",
            title="Operating Systems Concepts",
            category="Textbooks and References",
            text="Deadlock prevention requires eliminating mutual exclusion, hold and wait, no preemption, or circular wait.",
            page_number=145,
            branch="Computer Engineering",
            subject="Operating Systems"
        ),
        DocumentChunk(
            chunk_id="c2",
            document_id="doc_ee",
            title="Electrical Machines",
            category="Lecture Notes",
            text="In a three-phase induction motor, the rotating magnetic field rotates at synchronous speed Ns = 120f/P.",
            page_number=32,
            branch="Electrical Engineering",
            subject="Electrical Machines"
        )
    ]

    retrieval_service.add_document_chunks(chunks)

    # 1. Search for Deadlock (Should retrieve OS chunk)
    results = retrieval_service.search("How to prevent deadlock and circular wait?", top_k=2)
    assert len(results) > 0
    assert results[0].document_id == "doc_os"
    assert results[0].page_number == 145
    assert "circular wait" in results[0].snippet

    # 2. Search with branch filter
    ee_results = retrieval_service.search("synchronous speed", branch="Electrical Engineering")
    assert len(ee_results) > 0
    assert ee_results[0].document_id == "doc_ee"

    # 3. Clean up
    retrieval_service.remove_document("doc_os")
    retrieval_service.remove_document("doc_ee")
