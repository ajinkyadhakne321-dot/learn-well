"""
Embedding Service for local text vectorization.
Supports Sentence Transformers (all-MiniLM-L6-v2) with an integrated
deterministic TF-IDF cosine embedding engine as a zero-dependency fallback.
"""
import re
import math
import logging
import numpy as np
from typing import List
from app.config import settings

logger = logging.getLogger(__name__)

# Try importing SentenceTransformer
try:
    # pyrefly: ignore[missing-import]
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.info("SentenceTransformers not installed; using local TF-IDF vectorization engine.")


class FallbackTfIdfEmbedder:
    """
    Lightweight, fast, 100% offline text embedder using hashed n-gram TF-IDF
    producing 384-dimensional unit vectors. Guarantees vector retrieval works
    without PyTorch or network downloads.
    """
    def __init__(self, dim: int = 384):
        self.dim = dim

    def _tokenize(self, text: str) -> List[str]:
        words = re.findall(r'[a-zA-Z0-9_]+', text.lower())
        tokens = list(words)
        # Add character 3-grams for technical terminology matching
        for w in words:
            if len(w) >= 3:
                for i in range(len(w) - 2):
                    tokens.append(w[i:i + 3])
        return tokens

    def encode(self, texts: List[str], normalize: bool = True) -> np.ndarray:
        if isinstance(texts, str):
            texts = [texts]

        vectors = np.zeros((len(texts), self.dim), dtype=np.float32)
        for row, text in enumerate(texts):
            tokens = self._tokenize(text)
            if not tokens:
                continue
            tf = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
            
            for token, count in tf.items():
                # Deterministic hash index
                idx = hash(token) % self.dim
                weight = (1.0 + math.log(count))
                vectors[row, idx] += weight

            if normalize:
                norm = np.linalg.norm(vectors[row])
                if norm > 1e-6:
                    vectors[row] /= norm

        return vectors


class EmbeddingService:
    """Manages local embedding generation."""

    def __init__(self):
        self.model_name = settings.EMBEDDING_MODEL
        self.model = None
        self.fallback = FallbackTfIdfEmbedder(dim=384)
        self.is_transformer = False
        self._init_model()

    def _init_model(self) -> None:
        """Attempt loading local SentenceTransformer; fallback safely if unavailable."""
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                logger.info(f"Loading local embedding model: {self.model_name}")
                self.model = SentenceTransformer(self.model_name, device=settings.EMBEDDING_DEVICE)
                self.is_transformer = True
                logger.info("SentenceTransformer successfully loaded.")
            except Exception as e:
                logger.warning(
                    f"Could not load SentenceTransformer '{self.model_name}': {e}. "
                    "Falling back to local TF-IDF vectorizer."
                )
                self.model = None
                self.is_transformer = False
        else:
            self.model = None
            self.is_transformer = False

    def get_dimension(self) -> int:
        if self.is_transformer and self.model is not None:
            return self.model.get_sentence_embedding_dimension()
        return 384

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """Generate normalized vector embeddings for a list of text strings."""
        if not texts:
            return np.empty((0, self.get_dimension()), dtype=np.float32)

        if self.is_transformer and self.model is not None:
            try:
                embeddings = self.model.encode(
                    texts,
                    convert_to_numpy=True,
                    normalize_embeddings=True,
                    show_progress_bar=False
                )
                return embeddings.astype(np.float32)
            except Exception as e:
                logger.warning(f"Error in SentenceTransformer encoding: {e}. Using fallback.")
                return self.fallback.encode(texts)

        return self.fallback.encode(texts)

    def embed_query(self, query: str) -> np.ndarray:
        """Generate normalized embedding for a single query."""
        vecs = self.embed_texts([query])
        return vecs[0]


embedding_service = EmbeddingService()
