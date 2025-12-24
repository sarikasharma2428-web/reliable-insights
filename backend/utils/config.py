"""Configuration"""
from pydantic_settings import BaseSettings

import os

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/sre_platform")
    PROMETHEUS_URL: str = "http://prometheus:9090"
    LOKI_URL: str = "http://loki:3100"
    # Secure CORS configuration - use specific origins instead of wildcard
    ALLOWED_ORIGINS: list = os.getenv(
        "ALLOWED_ORIGINS", 
        "http://localhost:5173,http://localhost:4173,http://localhost:3000"
    ).split(",")
    COLLECTION_INTERVAL_SECONDS: int = 30
    DETECTION_INTERVAL_SECONDS: int = 15
    ALERT_EVALUATION_INTERVAL_SECONDS: int = 30
    
    class Config:
        env_file = ".env"

settings = Settings()
