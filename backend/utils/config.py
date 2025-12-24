"""Configuration"""
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/sre_platform"
    PROMETHEUS_URL: str = "http://prometheus:9090"
    LOKI_URL: str = "http://loki:3100"
    ALLOWED_ORIGINS: list = ["*"]
    COLLECTION_INTERVAL_SECONDS: int = 30
    DETECTION_INTERVAL_SECONDS: int = 15
    ALERT_EVALUATION_INTERVAL_SECONDS: int = 30
    
    class Config:
        env_file = ".env"

settings = Settings()
