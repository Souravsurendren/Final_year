"""
Authentication Middleware for FastAPI
Handles session verification and protects routes
"""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional


# Public routes that don't require authentication
PUBLIC_ROUTES = [
    "/",
    "/static",
    "/health",
    "/info",
    "/auth/register",
    "/auth/login",
    "/auth/me",
    "/auth/logout",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/login.html"
]


class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware to verify authentication on protected routes"""
    
    def __init__(self, app, auth_manager):
        super().__init__(app)
        self.auth_manager = auth_manager
    
    async def dispatch(self, request: Request, call_next):
        """Check authentication for protected routes"""
        
        # Check if route is public
        path = request.url.path
        
        # Allow public routes
        if any(path.startswith(route) for route in PUBLIC_ROUTES):
            return await call_next(request)
        
        # Get session token from cookie or header
        session_token = request.cookies.get("session_token")
        if not session_token:
            session_token = request.headers.get("Authorization", "").replace("Bearer ", "")
        
        # Verify session
        if session_token:
            user = self.auth_manager.verify_session(session_token)
            if user:
                # Add user info to request state
                request.state.user = user
                return await call_next(request)
        
        # Unauthorized
        return JSONResponse(
            status_code=401,
            content={"success": False, "error": "Authentication required"}
        )


def get_current_user(request: Request) -> Optional[dict]:
    """Get current user from request state"""
    return getattr(request.state, "user", None)


def require_auth(request: Request) -> dict:
    """Require authentication and return user info"""
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
