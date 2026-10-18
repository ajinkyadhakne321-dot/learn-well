"""
Voice API endpoints for Speech-to-Text and Text-to-Speech.
Enables offline transcription via local models and local offline speech synthesis.
"""
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from app.config import settings
from app.models.schemas import TranscribeResponse, SynthesizeRequest, SynthesizeResponse
from app.services.speech_to_text import stt_service
from app.services.text_to_speech import tts_service

router = APIRouter(prefix="/api/voice", tags=["Voice"])


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribe uploaded audio (WAV, MP3, WebM, M4A) using the local speech recognition engine.
    Audio is processed locally and discarded immediately afterwards for privacy.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Audio file must have a filename.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "wav"
    temp_filename = f"temp_upload_{uuid.uuid4().hex}.{ext}"
    temp_path = settings.AUDIO_DIR / temp_filename

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty audio content.")

    with open(temp_path, "wb") as f:
        f.write(content)

    try:
        result = stt_service.transcribe_audio_file(temp_path)
        return result
    finally:
        # Guarantee privacy: remove temporary recording
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass


@router.post("/synthesize", response_model=SynthesizeResponse)
def synthesize_speech(payload: SynthesizeRequest):
    """
    Synthesize text into a local audio file using offline TTS engine.
    Returns URL for browser playback.
    """
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    try:
        filename, engine = tts_service.synthesize(payload.text, voice=payload.voice)
        audio_url = f"/api/voice/audio/{filename}"
        return SynthesizeResponse(
            audio_url=audio_url,
            engine=engine
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech synthesis error: {str(e)}")


@router.get("/audio/{filename}")
def stream_audio(filename: str):
    """
    Stream a synthesized audio file. Includes path traversal protection.
    """
    # Strict validation of filename
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename format.")

    file_path = settings.AUDIO_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found or expired.")

    # Determine media type
    ext = file_path.suffix.lower()
    media_types = {
        ".aiff": "audio/aiff",
        ".aif": "audio/aiff",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4"
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(path=file_path, media_type=media_type, filename=filename)
