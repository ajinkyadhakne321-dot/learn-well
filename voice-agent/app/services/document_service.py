"""
Educational Document Processing Service.
Handles safe file uploads, format validation, PDF/TXT/MD text extraction,
page preservation, chunking, and JSON-based document metadata registry.
"""
import re
import json
import uuid
import hashlib
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from app.config import settings
from app.models.schemas import DocumentCategory, DocumentMetadata

logger = logging.getLogger(__name__)

# Try importing PyMuPDF
try:
    import pymupdf as fitz
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    logger.warning("PyMuPDF is not available. PDF extraction will be disabled.")


class DocumentChunk:
    """Represents a discrete text chunk with provenance metadata."""
    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        title: str,
        category: str,
        text: str,
        page_number: Optional[int] = None,
        branch: Optional[str] = None,
        subject: Optional[str] = None,
        university: Optional[str] = None,
        semester: Optional[str] = None
    ):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.title = title
        self.category = category
        self.text = text
        self.page_number = page_number
        self.branch = branch
        self.subject = subject
        self.university = university
        self.semester = semester

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "title": self.title,
            "category": self.category,
            "text": self.text,
            "page_number": self.page_number,
            "branch": self.branch,
            "subject": self.subject,
            "university": self.university,
            "semester": self.semester,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DocumentChunk":
        return cls(**data)


class DocumentService:
    """Manages document uploads, extraction, chunking, and metadata storage."""

    def __init__(self):
        self.db_path = settings.DATABASE_PATH
        self.uploads_dir = settings.UPLOADS_DIR
        self._load_database()

    def _load_database(self) -> None:
        """Load document metadata registry from disk."""
        if self.db_path.exists():
            try:
                with open(self.db_path, "r", encoding="utf-8") as f:
                    self.docs_metadata: Dict[str, Dict[str, Any]] = json.load(f)
            except Exception as e:
                logger.error(f"Error loading document database: {e}. Starting fresh.")
                self.docs_metadata = {}
        else:
            self.docs_metadata = {}

    def _save_database(self) -> None:
        """Persist metadata registry to disk atomically."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = self.db_path.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(self.docs_metadata, f, indent=2)
        tmp_path.replace(self.db_path)

    def compute_sha256(self, content: bytes) -> str:
        """Calculate SHA-256 hash for deduplication and integrity check."""
        return hashlib.sha256(content).hexdigest()

    def check_duplicate(self, file_hash: str) -> Optional[str]:
        """Check if an identical file has already been indexed."""
        for doc_id, meta in self.docs_metadata.items():
            if meta.get("file_hash") == file_hash:
                return doc_id
        return None

    def validate_file(self, filename: str, content: bytes) -> None:
        """Validate file size and allowed extensions."""
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(content) > max_bytes:
            raise ValueError(
                f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
            )
        
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise ValueError(
                f"File type '.{ext}' is not supported. Allowed formats: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )

    def extract_text_from_pdf(self, content: bytes) -> List[Tuple[int, str]]:
        """Extract text from PDF preserving 1-indexed page numbers."""
        if not PYMUPDF_AVAILABLE:
            raise RuntimeError("PyMuPDF library is not available for PDF text extraction.")

        pages_text: List[Tuple[int, str]] = []
        try:
            doc = fitz.open(stream=content, filetype="pdf")
            if doc.page_count == 0:
                raise ValueError("PDF contains 0 pages.")

            total_extracted = 0
            for page_idx in range(doc.page_count):
                page = doc.load_page(page_idx)
                text = page.get_text("text").strip()
                if text:
                    pages_text.append((page_idx + 1, text))
                    total_extracted += len(text)

            doc.close()

            if total_extracted == 0:
                raise ValueError(
                    "No readable text could be extracted from this PDF. "
                    "It may be scanned or image-based, which requires OCR."
                )

            return pages_text
        except Exception as e:
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Corrupted or invalid PDF file: {str(e)}")

    def extract_text_from_plain(self, content: bytes) -> List[Tuple[int, str]]:
        """Extract text from TXT or Markdown files."""
        encodings = ["utf-8", "latin-1", "cp1252"]
        text = None
        for enc in encodings:
            try:
                text = content.decode(enc).strip()
                break
            except UnicodeDecodeError:
                continue

        if text is None:
            raise ValueError("Could not decode document text with supported encodings.")

        if not text:
            raise ValueError("Document file is empty.")

        # Single page for plain text
        return [(1, text)]

    def chunk_text(
        self,
        pages_text: List[Tuple[int, str]],
        doc_id: str,
        title: str,
        category: str,
        branch: Optional[str] = None,
        subject: Optional[str] = None,
        university: Optional[str] = None,
        semester: Optional[str] = None,
        chunk_size: int = 600,
        chunk_overlap: int = 100
    ) -> List[DocumentChunk]:
        """
        Split extracted text into overlapping chunks, respecting paragraphs
        where possible, and preserving page numbers.
        """
        chunks: List[DocumentChunk] = []
        chunk_idx = 0

        for page_num, text in pages_text:
            # Clean excessive whitespace
            clean_text = re.sub(r'\n{3,}', '\n\n', text).strip()
            
            # If text fits in single chunk
            if len(clean_text) <= chunk_size:
                chunk_id = f"{doc_id}_{chunk_idx}"
                chunks.append(DocumentChunk(
                    chunk_id=chunk_id,
                    document_id=doc_id,
                    title=title,
                    category=category,
                    text=clean_text,
                    page_number=page_num,
                    branch=branch,
                    subject=subject,
                    university=university,
                    semester=semester
                ))
                chunk_idx += 1
                continue

            # Sliding window with overlap
            start = 0
            while start < len(clean_text):
                end = min(start + chunk_size, len(clean_text))

                # Try to break at a newline or period if possible
                if end < len(clean_text):
                    last_nl = clean_text.rfind('\n', start, end)
                    last_period = clean_text.rfind('. ', start, end)
                    split_point = max(last_nl, last_period)
                    if split_point > start + (chunk_size // 2):
                        end = split_point + 1

                chunk_content = clean_text[start:end].strip()
                if chunk_content:
                    chunk_id = f"{doc_id}_{chunk_idx}"
                    chunks.append(DocumentChunk(
                        chunk_id=chunk_id,
                        document_id=doc_id,
                        title=title,
                        category=category,
                        text=chunk_content,
                        page_number=page_num,
                        branch=branch,
                        subject=subject,
                        university=university,
                        semester=semester
                    ))
                    chunk_idx += 1

                start = end - chunk_overlap
                if start >= len(clean_text) or end >= len(clean_text):
                    break

        return chunks

    def process_and_save_document(
        self,
        filename: str,
        content: bytes,
        category: DocumentCategory,
        title: Optional[str] = None,
        branch: Optional[str] = None,
        subject: Optional[str] = None,
        university: Optional[str] = None,
        semester: Optional[str] = None,
    ) -> Tuple[DocumentMetadata, List[DocumentChunk]]:
        """
        Validates, saves, extracts, and chunks an educational document.
        Returns the DocumentMetadata and generated chunks.
        """
        self.validate_file(filename, content)
        file_hash = self.compute_sha256(content)

        existing_id = self.check_duplicate(file_hash)
        if existing_id:
            existing_doc = self.docs_metadata[existing_id]
            raise ValueError(
                f"Duplicate document detected. This file is already indexed as '{existing_doc['title']}' (ID: {existing_id})."
            )

        doc_id = str(uuid.uuid4())
        ext = filename.rsplit(".", 1)[-1].lower()
        safe_filename = f"{doc_id}.{ext}"
        save_path = self.uploads_dir / safe_filename

        # Write safely to disk
        with open(save_path, "wb") as f:
            f.write(content)

        # Extract text based on format
        if ext == "pdf":
            pages_text = self.extract_text_from_pdf(content)
        else:
            pages_text = self.extract_text_from_plain(content)

        doc_title = title.strip() if title and title.strip() else filename

        chunks = self.chunk_text(
            pages_text=pages_text,
            doc_id=doc_id,
            title=doc_title,
            category=category.value,
            branch=branch,
            subject=subject,
            university=university,
            semester=semester,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )

        metadata_record = {
            "document_id": doc_id,
            "filename": filename,
            "internal_filename": safe_filename,
            "file_hash": file_hash,
            "title": doc_title,
            "category": category.value,
            "branch": branch,
            "subject": subject,
            "university": university,
            "semester": semester,
            "file_size_bytes": len(content),
            "page_count": len(pages_text),
            "chunk_count": len(chunks),
            "upload_timestamp": datetime.utcnow().isoformat() + "Z",
            "is_indexed": True
        }

        self.docs_metadata[doc_id] = metadata_record
        self._save_database()

        doc_meta = DocumentMetadata(
            document_id=doc_id,
            filename=filename,
            title=doc_title,
            category=category,
            branch=branch,
            subject=subject,
            university=university,
            semester=semester,
            file_size_bytes=len(content),
            page_count=len(pages_text),
            chunk_count=len(chunks),
            upload_timestamp=metadata_record["upload_timestamp"],
            is_indexed=True
        )

        return doc_meta, chunks

    def list_documents(self) -> List[DocumentMetadata]:
        """List all indexed educational documents."""
        docs = []
        for d in self.docs_metadata.values():
            docs.append(DocumentMetadata(
                document_id=d["document_id"],
                filename=d["filename"],
                title=d["title"],
                category=DocumentCategory(d["category"]),
                branch=d.get("branch"),
                subject=d.get("subject"),
                university=d.get("university"),
                semester=d.get("semester"),
                file_size_bytes=d["file_size_bytes"],
                page_count=d["page_count"],
                chunk_count=d["chunk_count"],
                upload_timestamp=d["upload_timestamp"],
                is_indexed=d.get("is_indexed", True)
            ))
        return docs

    def delete_document(self, document_id: str) -> bool:
        """Remove document file and metadata from database."""
        if document_id not in self.docs_metadata:
            return False

        meta = self.docs_metadata.pop(document_id)
        self._save_database()

        # Delete physical file
        internal_name = meta.get("internal_filename")
        if internal_name:
            file_path = self.uploads_dir / internal_name
            if file_path.exists():
                try:
                    file_path.unlink()
                except Exception as e:
                    logger.warning(f"Could not delete physical file {file_path}: {e}")

        return True


document_service = DocumentService()
