import os
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Centralized Application Configuration loaded from environment variables or .env file.
    """
    # API Settings
    APP_TITLE: str = "AI-Based Virtual Student API"
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    
    # PDF & Chunking Settings
    DEFAULT_CHUNK_SIZE: int = 1000
    DEFAULT_CHUNK_OVERLAP: int = 200
    
    # LLM Settings
    LLM_PROVIDER: str = "ollama"  # Options: ollama, huggingface, openai, mock
    
    # Ollama Local LLM Settings
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "phi3"
    OLLAMA_TIMEOUT: int = 45  # Timeout in seconds before falling back to external API
    
    # Groq Settings (Ultra-fast cloud fallback with Llama 3)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # HuggingFace Settings
    HF_TOKEN: str = ""
    HF_MODEL: str = "mistralai/Mistral-7B-Instruct-v0.2"
    
    # OpenAI Settings
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # JWT Settings
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 720

    # Lecturer registration code (empty disables lecturer registration)
    LECTURER_CODE: str = ""

    # MongoDB Settings (authentication only)
    MONGO_URI: str = ""
    MONGO_DB_NAME: str = "nova"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Singleton settings instance
settings = Settings()
