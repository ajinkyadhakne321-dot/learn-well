"""
Application configuration for AI Engineering Tutor.
Loads configuration from environment variables and provides safe defaults.
"""
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    APP_NAME: str = "AI Engineering Tutor"
    VERSION: str = "1.0.0"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = False

    # Local Ollama & Cloud Settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2:3b"
    OLLAMA_API_KEY: Optional[str] = None
    OLLAMA_TIMEOUT_SECONDS: int = 120

    # Local Embeddings & Retrieval Settings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DEVICE: str = "cpu"
    TOP_K_RETRIEVAL: int = 4
    CHUNK_SIZE: int = 600
    CHUNK_OVERLAP: int = 100

    # File Upload & Safety Limits
    MAX_UPLOAD_SIZE_MB: int = 25
    ALLOWED_EXTENSIONS: List[str] = ["pdf", "txt", "md"]

    # Storage Paths
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOADS_DIR: Path = BASE_DIR / "data" / "uploads"
    PROCESSED_DIR: Path = BASE_DIR / "data" / "processed"
    INDEXES_DIR: Path = BASE_DIR / "data" / "indexes"
    DATABASE_PATH: Path = BASE_DIR / "data" / "database" / "tutor_metadata.json"
    AUDIO_DIR: Path = BASE_DIR / "data" / "audio"

    # Voice & Speech Settings
    TTS_ENGINE: str = "native"  # "native" (macOS say), "system", "disabled"
    TTS_VOICE: str = "Samantha"
    STT_ENGINE: str = "whisper"  # "whisper", "web", "disabled"
    WHISPER_MODEL_SIZE: str = "tiny"

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def ensure_directories(self) -> None:
        """Create required runtime directories if they do not exist."""
        for path in [
            self.DATA_DIR,
            self.UPLOADS_DIR,
            self.PROCESSED_DIR,
            self.INDEXES_DIR,
            self.DATABASE_PATH.parent,
            self.AUDIO_DIR,
        ]:
            path.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_directories()
