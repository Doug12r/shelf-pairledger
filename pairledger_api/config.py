from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_url: str = "postgresql+asyncpg://shelf:changeme@shelf-db:5432/shelf"
    auth_url: str = "http://shelf-auth:8001"
    data_dir: str = "/data"
    base_path: str = "/pairledger"
    app_id: str = "pairledger"

    # Tunable per-system settings
    db_pool_size: int = 5
    db_max_overflow: int = 3
    log_level: str = "INFO"
    workers: int = 1

    model_config = {"env_prefix": "SHELF_"}


settings = Settings()
