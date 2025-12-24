"""API Key Authentication"""
from typing import Optional
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)) -> Optional[str]:
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required")
    # In production, validate against database
    return api_key
