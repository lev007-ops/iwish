from functools import cached_property
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    admin_password: str = "admin"
    secret_key: str = "dev-secret-change-me"
    data_dir: Path = Path("./data")
    # Set to true in production (served over HTTPS by Caddy).
    cookie_secure: bool = False
    # Directory with the built frontend (index.html + assets). Optional in dev.
    static_dir: Path | None = None

    @cached_property
    def uploads_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def database_url(self) -> str:
        return f"sqlite:///{(self.data_dir / 'iwish.db').resolve()}"


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.uploads_dir.mkdir(parents=True, exist_ok=True)
