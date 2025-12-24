"""Database Models"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
