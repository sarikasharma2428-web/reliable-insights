"""Tenant Isolation Middleware"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Extract tenant from header or API key
        request.state.tenant_id = request.headers.get("X-Tenant-ID", "default")
        return await call_next(request)
