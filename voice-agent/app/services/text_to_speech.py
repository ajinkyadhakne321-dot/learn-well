"""
Text-to-Speech (TTS) Service.
Integrates with local offline speech synthesis:
- macOS native high-quality offline 'say' command (exports AIFF/WAV)
- System pyttsx3 or Piper if installed
- Generates playable audio files and returns URLs for browser playback
"""
import uuid
import shutil
import logging
import platform
import subprocess
from typing import Optional, Tuple
from app.config import settings

logger = logging.getLogger(__name__)


class TextToSpeechService:
    """Provides local, offline text-to-speech audio synthesis."""

    def __init__(self):
        self.audio_dir = settings.AUDIO_DIR
        self.engine = settings.TTS_ENGINE.lower()
        self.default_voice = settings.TTS_VOICE
        self.system_os = platform.system()
        self._check_engine_availability()

    def _check_engine_availability(self) -> None:
        """Check available local TTS capabilities."""
        if self.system_os == "Darwin":
            self.has_say = shutil.which("say") is not None
        else:
            self.has_say = False

    def is_available(self) -> bool:
        """Check if any local TTS engine is functional."""
        if self.engine == "disabled":
            return False
        if self.system_os == "Darwin" and self.has_say:
            return True
        return False

    def get_status(self) -> str:
        if self.engine == "disabled":
            return "disabled"
        if self.system_os == "Darwin" and self.has_say:
            return f"active (macOS native 'say' engine - voice: {self.default_voice})"
        return "web_fallback_only (Install piper or use browser speech synthesis)"

    def synthesize(self, text: str, voice: Optional[str] = None) -> Tuple[str, str]:
        """
        Synthesize text into a local audio file.
        Returns (filename, engine_name).
        """
        clean_text = text.strip()
        # Remove markdown symbols and code blocks for clean spoken narration
        speech_text = self._prepare_text_for_speech(clean_text)
        if not speech_text:
            raise ValueError("No speakable text provided.")

        selected_voice = voice if voice else self.default_voice
        file_id = f"speech_{uuid.uuid4().hex[:12]}"

        # On macOS, use high-fidelity native 'say'
        if self.system_os == "Darwin" and self.has_say:
            aiff_path = self.audio_dir / f"{file_id}.aiff"
            try:
                # Use macOS say command to produce audio file
                cmd = ["/usr/bin/say", "-v", selected_voice, "-o", str(aiff_path), speech_text]
                subprocess.run(cmd, check=True, capture_output=True, timeout=30)
                
                # Check if afconvert is available to convert to wav or mp4 if desired, or return aiff
                # AIFF is natively playable in Safari, Chrome, and modern browsers on macOS
                return aiff_path.name, f"macOS Native ({selected_voice})"
            except subprocess.TimeoutExpired:
                raise RuntimeError("Speech synthesis timed out.")
            except subprocess.CalledProcessError:
                # If voice is invalid, try default without -v
                try:
                    cmd_fallback = ["/usr/bin/say", "-o", str(aiff_path), speech_text]
                    subprocess.run(cmd_fallback, check=True, capture_output=True, timeout=30)
                    return aiff_path.name, "macOS Native (Default)"
                except Exception as fallback_ex:
                    raise RuntimeError(f"macOS speech synthesis failed: {fallback_ex}")

        raise RuntimeError(
            "Local server-side TTS engine is not available on this platform. "
            "Browser Web Speech Synthesis will be used as the client-side local fallback."
        )

    def _prepare_text_for_speech(self, text: str) -> str:
        """Strip markdown links, excessive code blocks, and formatting characters."""
        import re
        # Remove code blocks: replace ```lang ... ``` with "[code block omitted in speech]"
        t = re.sub(r'```[\s\S]*?```', ' [Code block omitted in speech] ', text)
        # Remove inline code `foo`
        t = re.sub(r'`([^`]+)`', r'\1', t)
        # Remove markdown links [text](url)
        t = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', t)
        # Remove header markers #
        t = re.sub(r'#{1,6}\s*', '', t)
        # Remove bold/italic ** or *
        t = re.sub(r'\*{1,2}([^*]+)\*{1,2}', r'\1', t)
        # Remove LaTeX $...$
        t = re.sub(r'\$([^\$]+)\$', r' \1 ', t)
        # Limit to reasonable length for audio (first 1200 characters)
        if len(t) > 1200:
            t = t[:1200] + "... Check the text panel for the complete response."
        return t.strip()


tts_service = TextToSpeechService()
