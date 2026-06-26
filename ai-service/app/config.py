from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_base_url: str = "http://localhost:11434"
    model: str = "llama3.2"

    class Config:
        env_file = ".env"


settings = Settings()

# Mutable active model (can be changed at runtime via /config)
_active_model: str = settings.model


def get_active_model() -> str:
    return _active_model


def set_active_model(model: str) -> None:
    global _active_model
    _active_model = model
