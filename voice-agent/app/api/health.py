"""
Health, diagnostics, and system settings API endpoints.
Provides real-time verification of local Ollama runtime, model availability,
hardware capabilities, knowledge index counts, and speech engines.
"""
from fastapi import APIRouter, HTTPException
from app.config import settings
from app.models.schemas import HealthResponse, ModelConfigRequest
from app.services.llm_service import llm_service
from app.services.retrieval_service import retrieval_service
from app.services.speech_to_text import stt_service
from app.services.text_to_speech import tts_service

router = APIRouter(prefix="/api", tags=["Health & System"])


@router.get("/health", response_model=HealthResponse)
async def get_health_status():
    """
    Comprehensive system health check:
    - Ollama connectivity & model presence
    - Hardware-based recommendation
    - Document index chunk stats
    - Speech recognition & TTS status
    """
    ollama_health = await llm_service.check_health()
    retrieval_stats = retrieval_service.get_stats()
    hw_info = llm_service.get_hardware_recommendation()

    overall_status = "healthy" if ollama_health["connected"] and ollama_health["model_available"] else "degraded"

    return HealthResponse(
        status=overall_status,
        app_name=settings.APP_NAME,
        app_version=settings.VERSION,
        ollama_status=ollama_health["status"],
        ollama_url=ollama_health["url"],
        selected_model=llm_service.model,
        selected_model_available=ollama_health["model_available"],
        available_ollama_models=ollama_health.get("installed_models", []),
        hardware_recommendation=f"{hw_info.get('recommended_model')} ({hw_info.get('rationale')})",
        index_status=f"Active ({retrieval_stats['engine']})",
        indexed_documents_count=retrieval_stats["indexed_documents_count"],
        indexed_chunks_count=retrieval_stats["indexed_chunks_count"],
        voice_stt_status=stt_service.get_status(),
        voice_tts_status=tts_service.get_status()
    )


@router.get("/settings/hardware")
def get_hardware_info():
    """Retrieve detected hardware specs and recommended models."""
    return llm_service.get_hardware_recommendation()


@router.post("/settings/model")
def update_active_model(payload: ModelConfigRequest):
    """Dynamically switch the active Ollama model without code restart."""
    model_name = payload.model_name.strip()
    if not model_name:
        raise HTTPException(status_code=400, detail="Model name cannot be empty.")
    llm_service.set_model(model_name)
    return {
        "success": True,
        "active_model": llm_service.model,
        "message": f"Active model updated to '{llm_service.model}'"
    }
