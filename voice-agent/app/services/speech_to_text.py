"""
Speech-to-Text (STT) Service.
Integrates with local speech recognition models (Whisper / faster-whisper)
and provides clear fallback diagnostics and browser Web Speech API bridging.
"""
import logging
from pathlib import Path
from app.config import settings
from app.models.schemas import TranscribeResponse

logger = logging.getLogger(__name__)

# Check for whisper or faster-whisper
WHISPER_AVAILABLE = False

try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    whisper = None  # type: ignore[assignment]
    try:
        import faster_whisper  # noqa: F401
        WHISPER_AVAILABLE = True
    except ImportError:
        faster_whisper = None  # type: ignore[assignment]
        WHISPER_AVAILABLE = False


class SpeechToTextService:
    """Manages audio transcription with local models and fallback messaging."""

    def __init__(self):
        self.available = WHISPER_AVAILABLE
        self.model_size = settings.WHISPER_MODEL_SIZE
        self.model = None

    def is_available(self) -> bool:
        return self.available

    def get_status(self) -> str:
        if self.available:
            return f"active (Whisper local model: {self.model_size})"
        return "web_speech_api (Direct zero-latency browser speech recognition active; pip install openai-whisper for backend Whisper processing)"

    def _load_model(self):
        """Lazy load whisper model upon first audio request."""
        if not self.available:
            return None
        if self.model is None and whisper is not None:
            try:
                logger.info(f"Loading Whisper model '{self.model_size}' locally...")
                self.model = whisper.load_model(self.model_size)
            except Exception as e:
                logger.warning(f"Could not load Whisper model: {e}")
                self.model = None
        return self.model

    def transcribe_audio_file(self, file_path: Path) -> TranscribeResponse:
        """Transcribe an audio file using local Whisper engine."""
        if not self.available:
            return TranscribeResponse(
                text="",
                engine="none",
                error=(
                    "Local Whisper model is not installed on the server. "
                    "Use the built-in browser Web Speech recognition (click microphone in browser) "
                    "or install Whisper locally using: `pip install openai-whisper`."
                )
            )

        model = self._load_model()
        if model is None:
            return TranscribeResponse(
                text="",
                engine="whisper",
                error="Failed to initialize local Whisper model."
            )

        try:
            result = model.transcribe(str(file_path))
            transcribed_text = result.get("text", "").strip()
            detected_lang = result.get("language", "en")
            return TranscribeResponse(
                text=transcribed_text,
                language=detected_lang,
                engine=f"Whisper ({self.model_size})",
                error=None
            )
        except Exception as e:
            logger.error(f"Error during audio transcription: {e}")
            return TranscribeResponse(
                text="",
                engine="whisper",
                error=f"Transcription error: {str(e)}"
            )


stt_service = SpeechToTextService()
