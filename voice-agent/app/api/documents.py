"""
Document Management API endpoints.
Provides uploading, text extraction, page tracking, chunking,
metadata querying, and document removal from the vector search index.
"""
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.models.schemas import (
    DocumentCategory, DocumentMetadata, DocumentListResponse, DocumentDeleteResponse
)
from app.services.document_service import document_service
from app.services.retrieval_service import retrieval_service

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentMetadata, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    category: DocumentCategory = Form(DocumentCategory.UNIVERSITY_SYLLABUS),
    title: Optional[str] = Form(None),
    branch: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    university: Optional[str] = Form(None),
    semester: Optional[str] = Form(None),
):
    """
    Upload an educational document (PDF, TXT, MD).
    Validates file integrity, extracts text page-by-page, divides into chunks,
    generates vector embeddings, and registers into the local index.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        doc_meta, chunks = document_service.process_and_save_document(
            filename=file.filename,
            content=content,
            category=category,
            title=title,
            branch=branch,
            subject=subject,
            university=university,
            semester=semester
        )

        # Add generated chunks to retrieval index
        retrieval_service.add_document_chunks(chunks)

        return doc_meta
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(ex)}")


@router.get("", response_model=DocumentListResponse)
def list_documents():
    """Retrieve list of all indexed educational documents and their metadata."""
    docs = document_service.list_documents()
    return DocumentListResponse(documents=docs, total_count=len(docs))


@router.delete("/{document_id}", response_model=DocumentDeleteResponse)
def delete_document(document_id: str):
    """
    Remove an educational document from the registry, disk, and vector index.
    """
    success = document_service.delete_document(document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Remove associated chunks from vector index
    retrieval_service.remove_document(document_id)

    return DocumentDeleteResponse(
        document_id=document_id,
        success=True,
        message="Document and its vector index chunks were successfully deleted."
    )
