import json
import time
import logging
import urllib.request
from abc import ABC, abstractmethod
from typing import Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ValidationError  # pyright: ignore[reportMissingImports]
from app.config import settings
from app.demo_log import llm_call

logger = logging.getLogger(__name__)

class BaseLLMProvider(ABC):
    """
    Abstract interface for LLM providers.
    """
    @abstractmethod
    def generate(self, prompt: str, json_mode: bool = False) -> str:
        pass

class OllamaProvider(BaseLLMProvider):
    """
    Ollama LLM Provider using Ollama REST API.
    """
    def __init__(self, host: Optional[str] = None, model_name: Optional[str] = None):
        self.host = (host or settings.OLLAMA_HOST).rstrip("/")
        self.model_name = model_name or settings.OLLAMA_MODEL

    def generate(self, prompt: str, json_mode: bool = False) -> str:
        url = f"{self.host}/api/generate"
        payload_dict = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {"num_ctx": 4096, "temperature": 0.4},
        }
        if json_mode:
            payload_dict["format"] = "json"
        payload = json.dumps(payload_dict).encode("utf-8")

        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        max_attempts = 2  # one retry when Ollama fails with HTTP 500
        for attempt in range(max_attempts):
            started = time.perf_counter()
            try:
                with urllib.request.urlopen(req, timeout=settings.OLLAMA_TIMEOUT) as response:
                    if response.status != 200:
                        raise RuntimeError(f"Ollama API returned HTTP status code {response.status}.")
                    res_data = json.loads(response.read().decode("utf-8"))
                    if "response" not in res_data:
                        raise ValueError("Invalid response format received from Ollama API.")
                    response_text = res_data.get("response", "")
                    llm_call(
                        type(self).__name__,
                        self.model_name,
                        prompt,
                        json_mode=json_mode,
                        seconds=time.perf_counter() - started,
                        response=response_text,
                        attempt=attempt + 1,
                    )
                    return response_text
            except urllib.error.HTTPError as e:
                elapsed = time.perf_counter() - started
                if e.code == 500 and attempt < max_attempts - 1:
                    llm_call(
                        type(self).__name__,
                        self.model_name,
                        prompt,
                        json_mode=json_mode,
                        seconds=elapsed,
                        attempt=attempt + 1,
                        error=f"HTTP {e.code}: {e}",
                    )
                    logger.warning(f"Ollama returned HTTP 500; retrying once in 3 seconds: {e}")
                    time.sleep(3)
                    continue
                llm_call(
                    type(self).__name__,
                    self.model_name,
                    prompt,
                    json_mode=json_mode,
                    seconds=elapsed,
                    attempt=attempt + 1,
                    error=f"HTTP {e.code}: {e}",
                )
                logger.error(f"Failed to connect to Ollama server at {self.host}: {e}")
                raise ConnectionError(
                    f"LLM Connection Error: Unable to connect to local Ollama server at {self.host}. "
                    "Please verify that Ollama is installed and running."
                ) from e
            except (TimeoutError, urllib.error.URLError) as e:
                elapsed = time.perf_counter() - started
                llm_call(
                    type(self).__name__,
                    self.model_name,
                    prompt,
                    json_mode=json_mode,
                    seconds=elapsed,
                    attempt=attempt + 1,
                    error=str(e),
                )
                if "timed out" in str(e).lower() or isinstance(e, TimeoutError):
                    logger.error(f"Ollama local model generation timed out ({settings.OLLAMA_TIMEOUT}s): {e}")
                    raise TimeoutError(
                        f"LLM Timeout Error: Local Ollama model '{self.model_name}' timed out after {settings.OLLAMA_TIMEOUT}s. "
                        "Local CPU inference on long lecture texts may take extra time. Consider reducing prompt length or checking hardware resources."
                    ) from e
                logger.error(f"Failed to connect to Ollama server at {self.host}: {e}")
                raise ConnectionError(
                    f"LLM Connection Error: Unable to connect to local Ollama server at {self.host}. "
                    "Please verify that Ollama is installed and running."
                ) from e
            except json.JSONDecodeError as e:
                llm_call(
                    type(self).__name__,
                    self.model_name,
                    prompt,
                    json_mode=json_mode,
                    seconds=time.perf_counter() - started,
                    attempt=attempt + 1,
                    error=f"Invalid JSON: {e}",
                )
                logger.error(f"Failed to parse Ollama response as JSON: {e}")
                raise ValueError(f"LLM Response Error: Ollama returned invalid JSON output: {e}") from e
            except Exception as e:
                llm_call(
                    type(self).__name__,
                    self.model_name,
                    prompt,
                    json_mode=json_mode,
                    seconds=time.perf_counter() - started,
                    attempt=attempt + 1,
                    error=str(e),
                )
                logger.error(f"Ollama generation failed: {e}")
                raise RuntimeError(f"Ollama generation failed: {e}") from e
        raise RuntimeError("Ollama generation failed: retries exhausted.")

class OpenAIProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model_name = model_name or settings.OPENAI_MODEL

    def generate(self, prompt: str, json_mode: bool = False) -> str:
        if not self.api_key:
            raise ConnectionError("LLM Configuration Error: OPENAI_API_KEY is not set.")
        
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": "You are Atlas, an expert AI pedagogical tutor that analyzes lecture material and extracts student misconceptions in JSON format."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7
        }
        if json_mode:
            data["response_format"] = {"type": "json_object"}
        started = time.perf_counter()
        try:
            req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers)
            with urllib.request.urlopen(req, timeout=60) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                response_text = res_data["choices"][0]["message"]["content"]
                llm_call(
                    type(self).__name__,
                    self.model_name,
                    prompt,
                    json_mode=json_mode,
                    seconds=time.perf_counter() - started,
                    response=response_text,
                    attempt=1,
                )
                return response_text
        except Exception as e:
            llm_call(
                type(self).__name__,
                self.model_name,
                prompt,
                json_mode=json_mode,
                seconds=time.perf_counter() - started,
                attempt=1,
                error=str(e),
            )
            logger.error(f"OpenAI API call failed: {e}")
            raise ConnectionError(f"LLM Connection Error: OpenAI API request failed: {e}") from e

class HuggingFaceProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.HF_TOKEN
        self.model_name = model_name or settings.HF_MODEL

    def generate(self, prompt: str, json_mode: bool = False) -> str:
        # json_mode is accepted for interface compatibility but ignored here.
        if not self.api_key:
            raise ConnectionError("LLM Configuration Error: HF_TOKEN is not set.")
        url = f"https://api-inference.huggingface.co/models/{self.model_name}"
        payload = json.dumps({"inputs": prompt}).encode("utf-8")
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        started = time.perf_counter()
        try:
            req = urllib.request.Request(url, data=payload, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                if isinstance(res_data, list) and "generated_text" in res_data[0]:
                    response_text = res_data[0]["generated_text"]
                else:
                    response_text = json.dumps(res_data)
                llm_call(
                    type(self).__name__,
                    self.model_name,
                    prompt,
                    json_mode=json_mode,
                    seconds=time.perf_counter() - started,
                    response=response_text,
                    attempt=1,
                )
                return response_text
        except Exception as e:
            llm_call(
                type(self).__name__,
                self.model_name,
                prompt,
                json_mode=json_mode,
                seconds=time.perf_counter() - started,
                attempt=1,
                error=str(e),
            )
            logger.error(f"HuggingFace API request failed: {e}")
            raise ConnectionError(f"LLM Connection Error: HuggingFace API request failed: {e}") from e

class GroqProvider(BaseLLMProvider):
    """
    Groq Cloud API provider delivering ultra-fast cloud inference for Llama 3 models.
    """
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = (api_key or settings.GROQ_API_KEY).strip()
        self.model_name = (model_name or settings.GROQ_MODEL).strip()

    def generate(self, prompt: str, json_mode: bool = False) -> str:
        if not self.api_key:
            raise ConnectionError("LLM Configuration Error: GROQ_API_KEY is not set.")

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
        }
        data = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": "You are Atlas, an expert AI pedagogical tutor that analyzes lecture material and extracts student misconceptions in JSON format."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.4
        }
        if json_mode:
            data["response_format"] = {"type": "json_object"}

        started = time.perf_counter()
        try:
            req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers)
            with urllib.request.urlopen(req, timeout=45) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                response_text = res_data["choices"][0]["message"]["content"]
                llm_call(
                    type(self).__name__,
                    self.model_name,
                    prompt,
                    json_mode=json_mode,
                    seconds=time.perf_counter() - started,
                    response=response_text,
                    attempt=1,
                )
                return response_text
        except Exception as e:
            llm_call(
                type(self).__name__,
                self.model_name,
                prompt,
                json_mode=json_mode,
                seconds=time.perf_counter() - started,
                attempt=1,
                error=str(e),
            )
            logger.error(f"Groq API call failed: {e}")
            raise ConnectionError(f"LLM Connection Error: Groq API request failed: {e}") from e

class FallbackLLMProvider(BaseLLMProvider):
    """
    Primary provider (e.g. Ollama) with seamless fallback to external cloud APIs
    (Groq, OpenAI, or HuggingFace) on timeout or connection failures.
    """
    def __init__(self, primary: BaseLLMProvider, fallback: Optional[BaseLLMProvider] = None):
        self.primary = primary
        self.fallback = fallback
        self.model_name = getattr(primary, "model_name", "primary")

    def generate(self, prompt: str, json_mode: bool = False) -> str:
        try:
            return self.primary.generate(prompt, json_mode=json_mode)
        except (TimeoutError, ConnectionError, RuntimeError) as primary_err:
            if not self.fallback:
                logger.error(f"Primary provider failed and no fallback configured: {primary_err}")
                raise primary_err
            
            logger.warning(
                f"Primary provider {type(self.primary).__name__} timed out or failed ({primary_err}). "
                f"Switching automatically to fallback provider {type(self.fallback).__name__}..."
            )
            return self.fallback.generate(prompt, json_mode=json_mode)

def get_fallback_provider() -> Optional[BaseLLMProvider]:
    """Returns the best available external cloud fallback provider based on configured API keys."""
    if settings.GROQ_API_KEY:
        logger.info(f"Configuring GroqProvider as cloud fallback ({settings.GROQ_MODEL})")
        return GroqProvider()
    if settings.OPENAI_API_KEY:
        logger.info(f"Configuring OpenAIProvider as cloud fallback ({settings.OPENAI_MODEL})")
        return OpenAIProvider()
    if settings.HF_TOKEN:
        logger.info(f"Configuring HuggingFaceProvider as cloud fallback ({settings.HF_MODEL})")
        return HuggingFaceProvider()
    return None

def get_llm_provider() -> BaseLLMProvider:
    """
    Factory function returning configured LLM provider according to settings.
    When Ollama is selected, automatically wraps it in FallbackLLMProvider if an external API key is set.
    """
    provider_type = settings.LLM_PROVIDER.lower()
    fallback = get_fallback_provider()
    
    if provider_type == "groq" or (provider_type not in ["ollama", "openai", "huggingface"] and settings.GROQ_API_KEY):
        logger.info(f"Using GroqProvider directly ({settings.GROQ_MODEL})")
        return GroqProvider()
    elif provider_type == "ollama":
        primary = OllamaProvider()
        if fallback:
            logger.info(f"Using OllamaProvider with fallback to {type(fallback).__name__}")
            return FallbackLLMProvider(primary=primary, fallback=fallback)
        logger.info(f"Using OllamaProvider without fallback ({settings.OLLAMA_MODEL} @ {settings.OLLAMA_HOST})")
        return primary
    elif provider_type == "huggingface" or settings.HF_TOKEN:
        logger.info(f"Using HuggingFaceProvider ({settings.HF_MODEL})")
        return HuggingFaceProvider()
    elif provider_type == "openai" or settings.OPENAI_API_KEY:
        logger.info(f"Using OpenAIProvider ({settings.OPENAI_MODEL})")
        return OpenAIProvider()
    else:
        raise ConnectionError(
            f"LLM Provider Error: Unknown or unconfigured provider '{provider_type}'. "
            "Please configure a valid LLM provider (Ollama, Groq, OpenAI, or HuggingFace)."
        )

def generate_response(prompt: str, provider: Optional[BaseLLMProvider] = None, json_mode: bool = False) -> str:
    """
    Reusable function that accepts a prompt and returns the model response string.
    Uses the configured LLM provider by default.
    """
    if provider is None:
        provider = get_llm_provider()
    return provider.generate(prompt, json_mode=json_mode)


def _strip_markdown_fences(text: str) -> str:
    """Removes wrapping markdown code fences (```json ... ```) from LLM output."""
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


def generate_json(
    prompt: str,
    schema: type[BaseModel],
    provider: Optional[BaseLLMProvider] = None,
    retries: int = 1,
) -> BaseModel:
    """
    Calls the LLM in JSON mode, strips markdown fences, parses the JSON, and
    validates it against the given Pydantic model.

    On parse or validation failure, retries up to `retries` additional times,
    appending a short "return only valid JSON" reminder to the prompt.
    Raises ValueError if the response still cannot be parsed and validated.
    """
    if provider is None:
        provider = get_llm_provider()

    provider_name = type(provider).__name__
    model_name = getattr(provider, "model_name", "")
    current_prompt = prompt
    last_error: Optional[Exception] = None
    for attempt in range(retries + 1):
        raw_response = provider.generate(current_prompt, json_mode=True)
        try:
            clean_response = _strip_markdown_fences(raw_response)
            parsed = json.loads(clean_response)
            return schema(**parsed)
        except (json.JSONDecodeError, ValidationError) as e:
            last_error = e
            llm_call(
                provider_name,
                model_name,
                current_prompt,
                json_mode=True,
                response=raw_response,
                attempt=attempt + 1,
                error=f"{type(e).__name__}: {e}",
            )
            logger.warning(
                f"generate_json attempt {attempt + 1}/{retries + 1} failed for {schema.__name__}: {e}"
            )
            current_prompt = (
                prompt + "\n\nIMPORTANT: Return only valid JSON matching the required schema."
            )

    raise ValueError(
        f"LLM Response Error: Failed to obtain valid JSON for {schema.__name__} "
        f"after {retries + 1} attempt(s). Last error: {last_error}"
    )

