"""Database Connection"""
import asyncpg
from utils.config import settings

_pool = None

async def get_db_pool():
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(settings.DATABASE_URL)
    return _pool

async def init_db():
    await get_db_pool()

async def close_db():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None

async def get_db():
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        yield conn
