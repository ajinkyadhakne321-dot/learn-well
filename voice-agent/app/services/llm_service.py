"""
Local Language Model Service integrating with Ollama.
Supports connection health checks, model availability verification,
hardware-tailored model recommendations, multi-turn chat, and streaming.
"""
import os
import json
import logging
import platform
import httpx
from typing import List, Dict, Any, Optional, AsyncIterator
from app.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """Manages connections and generation with the local Ollama LLM runtime."""

    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.OLLAMA_TIMEOUT_SECONDS

    def set_model(self, model_name: str) -> None:
        """Dynamically update active model name."""
        self.model = model_name.strip()
        logger.info(f"LLM model set to: {self.model}")

    def get_hardware_recommendation(self) -> Dict[str, Any]:
        """Detect system resources and recommend an appropriate local model."""
        system_type = platform.system()
        machine = platform.machine()
        
        # Default recommendation
        recommendation = {
            "system": f"{system_type} ({machine})",
            "recommended_model": "llama3.2:3b",
            "recommended_coding_model": "qwen2.5-coder:7b",
            "rationale": "High efficiency and fast token generation on Apple Silicon & modern CPUs."
        }

        # Try to detect memory on macOS or Linux
        try:
            if system_type == "Darwin":
                import subprocess
                out = subprocess.check_output(["sysctl", "-n", "hw.memsize"]).strip()
                ram_gb = int(out) / (1024 ** 3)
                recommendation["detected_ram_gb"] = round(ram_gb, 1)
                if ram_gb >= 16:
                    recommendation["recommended_model"] = "llama3.2:3b"
                    recommendation["alternative_models"] = ["qwen2.5-coder:7b", "mistral:7b", "phi3:mini"]
                    recommendation["rationale"] = (
                        f"Detected {round(ram_gb)}GB unified memory. Can comfortably run 3B-7B 4-bit quantized models."
                    )
                else:
                    recommendation["recommended_model"] = "phi3:mini"
                    recommendation["alternative_models"] = ["llama3.2:1b", "llama3.2:3b"]
                    recommendation["rationale"] = (
                        f"Detected {round(ram_gb)}GB RAM. Lightweight 1B-3B models recommended to preserve system memory."
                    )
        except Exception as e:
            logger.debug(f"Could not probe hardware specs: {e}")

        return recommendation

    def is_cloud_model(self) -> bool:
        """Check if active model is an Ollama cloud model."""
        return self.model.endswith(":cloud") or "ollama.com" in self.base_url

    def _get_headers(self) -> Dict[str, str]:
        """Prepare request headers including optional API key."""
        headers = {"Content-Type": "application/json"}
        api_key = settings.OLLAMA_API_KEY or os.environ.get("OLLAMA_API_KEY")
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        return headers

    async def check_health(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Check whether Ollama is active and verify if the selected model is available.
        Supports both local models and Ollama Cloud models with connection caching.
        """
        import time
        now = time.time()
        if not force_refresh and hasattr(self, "_health_cache") and (now - getattr(self, "_health_cache_time", 0)) < 45.0:
            return self._health_cache

        result = {
            "connected": False,
            "status": "unreachable",
            "url": self.base_url,
            "selected_model": self.model,
            "is_cloud_model": self.is_cloud_model(),
            "model_available": False,
            "installed_models": [],
            "instructions": ""
        }

        health_timeout = 15.0 if self.is_cloud_model() else 4.0

        try:
            headers = self._get_headers()
            async with httpx.AsyncClient(timeout=health_timeout) as client:
                resp = await client.get(f"{self.base_url}/api/tags", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    result["connected"] = True
                    result["status"] = "connected"
                    result["installed_models"] = models

                    if self.is_cloud_model():
                        result["model_available"] = True
                        result["instructions"] = (
                            f"Cloud model '{self.model}' active via Ollama Cloud."
                        )
                    else:
                        model_root = self.model.split(":")[0]
                        matched = any(
                            self.model == m or m.startswith(f"{model_root}:") or m == model_root
                            for m in models
                        )
                        result["model_available"] = matched

                        if not matched:
                            result["instructions"] = (
                                f"Model '{self.model}' is not downloaded yet. "
                                f"Run in your terminal: `ollama pull {self.model}`"
                            )
                    # Cache successful result
                    self._health_cache = result
                    self._health_cache_time = now
                else:
                    result["status"] = f"error_http_{resp.status_code}"
                    result["instructions"] = f"Ollama returned unexpected status {resp.status_code}."
        except httpx.ConnectError:
            result["status"] = "not_running"
            result["instructions"] = (
                f"Ollama server is not running at {self.base_url}.\n"
                "1. If Ollama is installed, start it by running `ollama serve` in a terminal.\n"
                "2. If Ollama is not installed, download it from https://ollama.com\n"
                f"3. For local models: `ollama run {self.model}` | For cloud: `ollama signin`"
            )
        except Exception as ex:
            result["status"] = "error"
            result["instructions"] = f"Failed to connect to local Ollama service: {str(ex)}"

        return result

    async def generate_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.2
    ) -> str:
        """
        Execute chat completion using local Ollama instance or Ollama Cloud.
        Raises RuntimeError with actionable advice if Ollama is unavailable.
        """
        health = await self.check_health()
        if not health["connected"]:
            raise RuntimeError(
                f"Local LLM runtime is offline. {health['instructions']}"
            )
        if not health["model_available"]:
            if health["installed_models"]:
                installed_list = ", ".join(health["installed_models"])
                raise RuntimeError(
                    f"Selected model '{self.model}' is not installed in Ollama. "
                    f"Available models: [{installed_list}]. "
                    f"Download via: `ollama pull {self.model}` or change model in Settings."
                )
            else:
                raise RuntimeError(
                    f"No models found in local Ollama service. "
                    f"Please download a model using: `ollama pull {self.model}`"
                )

        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        formatted_messages.extend(messages)

        payload = {
            "model": self.model,
            "messages": formatted_messages,
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }

        headers = self._get_headers()

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                    headers=headers
                )
                if resp.status_code == 401 or resp.status_code == 403:
                    raise RuntimeError(
                        f"Authentication required for cloud model '{self.model}'. "
                        "Please run `ollama signin` in your terminal, or create an API key at "
                        "https://ollama.com/settings/keys and add OLLAMA_API_KEY to your .env file."
                    )
                elif resp.status_code != 200:
                    raise RuntimeError(
                        f"Ollama returned HTTP error {resp.status_code}: {resp.text}"
                    )
                data = resp.json()
                message_content = data.get("message", {}).get("content", "")
                if not message_content:
                    raise RuntimeError("Ollama returned an empty response.")
                return message_content
        except httpx.ReadTimeout:
            raise RuntimeError(
                f"Ollama request timed out after {self.timeout} seconds. "
                "Consider using a faster cloud or compact model for lower latency."
            )
        except httpx.RequestError as exc:
            raise RuntimeError(f"Network error communicating with Ollama: {exc}")

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.2
    ) -> AsyncIterator[str]:
        """Stream response chunks from Ollama."""
        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        formatted_messages.extend(messages)

        payload = {
            "model": self.model,
            "messages": formatted_messages,
            "stream": True,
            "options": {
                "temperature": temperature
            }
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    raise RuntimeError(f"Ollama streaming error ({response.status_code}): {error_text.decode('utf-8', errors='ignore')}")
                
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                        content = chunk.get("message", {}).get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue


llm_service = LLMService()
