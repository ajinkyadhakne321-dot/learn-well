"""
Knowledge Retrieval Service.
Maintains the local vector index, performs similarity search,
applies academic filters (branch, subject, university, semester, category),
and produces attributed source references with page numbers.
"""
import json
import logging
from typing import List, Dict, Any, Optional
import numpy as np

from app.config import settings
from app.models.schemas import SourceReference
from app.services.embedding_service import embedding_service
from app.services.document_service import DocumentChunk

logger = logging.getLogger(__name__)

# Attempt FAISS import
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    logger.info("FAISS not installed; using high-performance NumPy cosine similarity index.")


class RetrievalService:
    """Manages document vector indexing and semantic retrieval."""

    def __init__(self):
        self.index_dir = settings.INDEXES_DIR
        self.chunks_path = self.index_dir / "chunks_registry.json"
        self.embeddings_path = self.index_dir / "embeddings.npy"
        self.chunks: List[Dict[str, Any]] = []
        self.embeddings: Optional[np.ndarray] = None
        self.faiss_index = None
        self._load_index()

    def _load_index(self) -> None:
        """Load stored chunks metadata and vector embeddings from disk."""
        if self.chunks_path.exists() and self.embeddings_path.exists():
            try:
                with open(self.chunks_path, "r", encoding="utf-8") as f:
                    self.chunks = json.load(f)
                self.embeddings = np.load(self.embeddings_path)
                
                # Verify consistency
                if len(self.chunks) != len(self.embeddings):
                    logger.warning("Index chunk count mismatch. Rebuilding index recommended.")
                elif FAISS_AVAILABLE and len(self.embeddings) > 0:
                    dim = self.embeddings.shape[1]
                    self.faiss_index = faiss.IndexFlatIP(dim)
                    self.faiss_index.add(self.embeddings.astype(np.float32))
            except Exception as e:
                logger.error(f"Error loading vector index: {e}. Starting with empty index.")
                self.chunks = []
                self.embeddings = None
                self.faiss_index = None
        else:
            self.chunks = []
            self.embeddings = None
            self.faiss_index = None

    def _persist_index(self) -> None:
        """Atomically persist chunks registry and embeddings matrix to disk."""
        self.index_dir.mkdir(parents=True, exist_ok=True)
        with open(self.chunks_path, "w", encoding="utf-8") as f:
            json.dump(self.chunks, f, indent=2)

        if self.embeddings is not None and len(self.embeddings) > 0:
            np.save(self.embeddings_path, self.embeddings)
        elif self.embeddings_path.exists():
            self.embeddings_path.unlink()

    def get_stats(self) -> Dict[str, Any]:
        """Return diagnostic metrics about the local knowledge base."""
        doc_ids = set(c["document_id"] for c in self.chunks)
        return {
            "indexed_documents_count": len(doc_ids),
            "indexed_chunks_count": len(self.chunks),
            "embedding_dimension": self.embeddings.shape[1] if self.embeddings is not None else 0,
            "engine": "FAISS (FlatIP)" if self.faiss_index is not None else "NumPy Cosine Search"
        }

    def add_document_chunks(self, new_chunks: List[DocumentChunk]) -> None:
        """Embed and append new document chunks into the search index."""
        if not new_chunks:
            return

        texts = [c.text for c in new_chunks]
        new_vecs = embedding_service.embed_texts(texts)

        # Append chunks
        chunk_dicts = [c.to_dict() for c in new_chunks]
        self.chunks.extend(chunk_dicts)

        if self.embeddings is None or len(self.embeddings) == 0:
            self.embeddings = new_vecs
        else:
            self.embeddings = np.vstack([self.embeddings, new_vecs])

        # Update FAISS if active
        if FAISS_AVAILABLE and self.embeddings is not None:
            dim = self.embeddings.shape[1]
            self.faiss_index = faiss.IndexFlatIP(dim)
            self.faiss_index.add(self.embeddings.astype(np.float32))

        self._persist_index()
        logger.info(f"Added {len(new_chunks)} chunks to vector index. Total: {len(self.chunks)}")

    def remove_document(self, document_id: str) -> None:
        """Remove all chunks associated with a specific document from the index."""
        if not self.chunks:
            return

        keep_indices = []
        new_chunks = []
        for i, c in enumerate(self.chunks):
            if c["document_id"] != document_id:
                keep_indices.append(i)
                new_chunks.append(c)

        if len(keep_indices) == len(self.chunks):
            return  # Nothing removed

        self.chunks = new_chunks
        if self.embeddings is not None and len(keep_indices) > 0:
            self.embeddings = self.embeddings[keep_indices]
            if FAISS_AVAILABLE:
                dim = self.embeddings.shape[1]
                self.faiss_index = faiss.IndexFlatIP(dim)
                self.faiss_index.add(self.embeddings.astype(np.float32))
        else:
            self.embeddings = None
            self.faiss_index = None

        self._persist_index()
        logger.info(f"Removed document {document_id} from index. Remaining chunks: {len(self.chunks)}")

    def search(
        self,
        query: str,
        top_k: int = 4,
        branch: Optional[str] = None,
        subject: Optional[str] = None,
        university: Optional[str] = None,
        semester: Optional[str] = None,
        category: Optional[str] = None,
        similarity_threshold: float = 0.15
    ) -> List[SourceReference]:
        """
        Search for syllabus chunks semantically matching the query.
        Applies optional filters (branch, subject, university, semester, category).
        """
        if not self.chunks or self.embeddings is None or len(self.embeddings) == 0:
            return []

        query_vec = embedding_service.embed_query(query)
        if len(query_vec.shape) == 1:
            query_vec = query_vec.reshape(1, -1)

        # Calculate cosine similarity scores
        scores = np.dot(self.embeddings, query_vec.T).flatten()

        # Build candidate matches with academic filter checks
        candidates = []
        for idx, score in enumerate(scores):
            chunk = self.chunks[idx]

            # Apply subject filter
            if subject and chunk.get("subject"):
                if subject.lower() not in chunk["subject"].lower() and chunk["subject"].lower() not in subject.lower():
                    continue

            # Apply branch filter
            if branch and chunk.get("branch"):
                if branch.lower() not in chunk["branch"].lower() and chunk["branch"].lower() not in branch.lower():
                    continue

            # Apply university filter
            if university and chunk.get("university"):
                if university.lower() not in chunk["university"].lower():
                    continue

            # Apply semester filter
            if semester and chunk.get("semester"):
                if semester.lower() != chunk["semester"].lower():
                    continue

            # Apply category filter
            if category and chunk.get("category"):
                if category.lower() != chunk["category"].lower():
                    continue

            if score >= similarity_threshold:
                candidates.append((score, chunk))

        # Sort descending by similarity score
        candidates.sort(key=lambda x: x[0], reverse=True)
        top_matches = candidates[:top_k]

        sources = []
        for score, chunk in top_matches:
            sources.append(SourceReference(
                document_id=chunk["document_id"],
                title=chunk["title"],
                category=chunk["category"],
                page_number=chunk.get("page_number"),
                branch=chunk.get("branch"),
                subject=chunk.get("subject"),
                score=round(float(score), 4),
                snippet=chunk["text"]
            ))

        return sources


retrieval_service = RetrievalService()
