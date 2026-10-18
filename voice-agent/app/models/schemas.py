"""
Pydantic data models and schemas for AI Engineering Tutor.
Covers chat, learning modes, document ingestion, retrieval, and health diagnostics.
"""
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class LearningMode(str, Enum):
    ACADEMIC_LEARNING = "Academic Learning"
    PROGRAMMING_CODING = "Programming & Coding"
    ENGINEERING_MATH = "Engineering Mathematics"
    EXAM_PREPARATION = "Exam Preparation"
    PRACTICAL_VIVA = "Practical & Viva"
    PROJECT_GUIDANCE = "Project Guidance"


class DocumentCategory(str, Enum):
    UNIVERSITY_SYLLABUS = "University Syllabus"
    LECTURE_NOTES = "Lecture Notes"
    TEXTBOOKS_REFERENCES = "Textbooks and References"
    ENGINEERING_MATHEMATICS = "Engineering Mathematics"
    PROGRAMMING_CODING = "Programming and Coding"
    LABORATORY_MANUALS = "Laboratory Manuals"
    PRACTICAL_VIVA = "Practical and Viva"
    PREVIOUS_EXAM_PAPERS = "Previous Examination Papers"
    PROJECT_DOCUMENTATION = "Project Documentation"
    OTHER_RESOURCES = "Other Resources"


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    mode: LearningMode = LearningMode.ACADEMIC_LEARNING
    branch: Optional[str] = None
    subject: Optional[str] = None
    university: Optional[str] = None
    semester: Optional[str] = None
    conversation_id: Optional[str] = None
    use_retrieval: bool = True
    stream: bool = False


class SourceReference(BaseModel):
    document_id: str
    title: str
    category: str
    page_number: Optional[int] = None
    branch: Optional[str] = None
    subject: Optional[str] = None
    score: float
    snippet: str


class MathVerification(BaseModel):
    expression: str
    verified: bool
    result: str
    steps: Optional[List[str]] = None
    error: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    mode: LearningMode
    sources: List[SourceReference] = []
    math_verification: Optional[MathVerification] = None
    conversation_id: str
    model_used: str
    retrieval_status: str  # "retrieved", "no_matches", "disabled", "empty_index"
    error: Optional[str] = None


class DocumentMetadata(BaseModel):
    document_id: str
    filename: str
    title: str
    category: DocumentCategory
    branch: Optional[str] = None
    subject: Optional[str] = None
    university: Optional[str] = None
    semester: Optional[str] = None
    file_size_bytes: int
    page_count: int
    chunk_count: int
    upload_timestamp: str
    is_indexed: bool = True


class DocumentListResponse(BaseModel):
    documents: List[DocumentMetadata]
    total_count: int


class DocumentDeleteResponse(BaseModel):
    document_id: str
    success: bool
    message: str


class HealthResponse(BaseModel):
    status: str
    app_name: str
    app_version: str
    ollama_status: str
    ollama_url: str
    selected_model: str
    selected_model_available: bool
    available_ollama_models: List[str] = []
    hardware_recommendation: str
    index_status: str
    indexed_documents_count: int
    indexed_chunks_count: int
    voice_stt_status: str
    voice_tts_status: str


class ModelConfigRequest(BaseModel):
    model_name: str


class TranscribeResponse(BaseModel):
    text: str
    language: Optional[str] = "en"
    duration_seconds: Optional[float] = None
    confidence: Optional[float] = None
    engine: str
    error: Optional[str] = None


class SynthesizeRequest(BaseModel):
    text: str
    voice: Optional[str] = None


class SynthesizeResponse(BaseModel):
    audio_url: str
    engine: str
    duration_seconds: Optional[float] = None
    error: Optional[str] = None
