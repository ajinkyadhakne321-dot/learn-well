"""
Chat API endpoint for the AI Engineering Tutor.
Integrates multi-turn conversation memory, the six engineering learning modes,
mathematics verification (SymPy), and syllabus document retrieval.
"""
import logging
from typing import Optional
# pyrefly: ignore[missing-import]
from fastapi import APIRouter
from app.models.schemas import (
    ChatRequest, ChatResponse, LearningMode, MathVerification
)
from app.prompts.tutor_prompts import build_system_prompt, format_retrieval_context
from app.services.llm_service import llm_service
from app.services.retrieval_service import retrieval_service
from app.services.mathematics_service import math_service
from app.services.conversation_service import conversation_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process an engineering question through the AI Tutor:
    1. Retrieve multi-turn conversation history.
    2. Check and perform symbolic mathematics verification if relevant.
    3. Retrieve relevant syllabus/reference chunks from the local vector index.
    4. Construct customized pedagogical prompt based on the active learning mode.
    5. Perform inference with the local Ollama LLM.
    6. Return response with verified sources, page numbers, and math verification proofs.
    """
    conv_id = conversation_service.get_or_create_id(request.conversation_id)

    # 1. Symbolic Mathematics Verification (if in Math mode or expression detected)
    math_result: Optional[MathVerification] = None
    if request.mode == LearningMode.ENGINEERING_MATH or any(k in request.message.lower() for k in ["solve", "derivative", "integral", "matrix"]):
        try:
            math_result = math_service.extract_and_verify_math(request.message)
        except Exception as e:
            logger.debug(f"Math verification error: {e}")

    # 2. Document Retrieval & Grounding
    sources = []
    retrieval_status = "disabled"
    stats = retrieval_service.get_stats()

    if request.use_retrieval:
        if stats["indexed_chunks_count"] == 0:
            retrieval_status = "empty_index"
        else:
            sources = retrieval_service.search(
                query=request.message,
                top_k=4,
                branch=request.branch,
                subject=request.subject,
                university=request.university,
                semester=request.semester
            )
            retrieval_status = "retrieved" if sources else "no_matches"

    # 3. Construct System Prompt & Pedagogical Context
    system_prompt = build_system_prompt(
        mode=request.mode,
        branch=request.branch,
        subject=request.subject,
        university=request.university,
        semester=request.semester,
        has_retrieved_docs=bool(sources)
    )

    # If math was formally verified, inject the symbolic proof into context
    if math_result and math_result.verified:
        math_context = (
            f"\n--- SYMBOLIC MATHEMATICS VERIFICATION (SymPy) ---\n"
            f"Expression: {math_result.expression}\n"
            f"Calculated Result: {math_result.result}\n"
            f"Steps:\n" + "\n".join(f"- {s}" for s in (math_result.steps or [])) + "\n"
            "--- END OF MATHEMATICS VERIFICATION ---\n"
        )
        system_prompt += math_context

    # Append retrieval context
    if sources:
        system_prompt += format_retrieval_context(sources)

    # 4. Prepare Conversation History
    history = conversation_service.get_messages(conv_id)
    history.append({"role": "user", "content": request.message})

    # 5. Local LLM Generation
    error_msg = None
    try:
        response_text = await llm_service.generate_chat(
            messages=history,
            system_prompt=system_prompt
        )
        # Store message history
        conversation_service.add_message(conv_id, "user", request.message)
        conversation_service.add_message(conv_id, "assistant", response_text)
    except RuntimeError as run_err:
        error_msg = str(run_err)
        logger.warning(f"Local LLM runtime exception: {error_msg}")
        response_text = (
            f"**[System Notice: Local Language Model Unavailable]**\n\n"
            f"{error_msg}\n\n"
            f"*Troubleshooting Tip:* Open a terminal and run `ollama serve` and `ollama pull {llm_service.model}`. "
            f"You can also change the model in the Settings tab."
        )

    return ChatResponse(
        response=response_text,
        mode=request.mode,
        sources=sources,
        math_verification=math_result,
        conversation_id=conv_id,
        model_used=llm_service.model,
        retrieval_status=retrieval_status,
        error=error_msg
    )


@router.post("/clear")
def clear_chat_history(conversation_id: Optional[str] = None):
    """Clear conversation history for privacy."""
    if conversation_id:
        conversation_service.clear_conversation(conversation_id)
        return {"success": True, "message": f"Cleared history for conversation {conversation_id}."}
    cleared = conversation_service.clear_all()
    return {"success": True, "message": f"Cleared all active conversation sessions ({cleared})."}
