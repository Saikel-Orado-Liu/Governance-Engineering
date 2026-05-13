"""ASGI middleware that injects a unique request ID into each request.

For every incoming request:
- Reads an existing ``X-Request-ID`` header if present (e.g. from a gateway).
- Otherwise generates a new UUID v4.
- Attaches it to ``request.state.request_id``.
- Adds the ``X-Request-ID`` response header.
"""

from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware that injects a UUID v4 request ID into request.state and response headers."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        """Generate or propagate a request ID and attach it to the state and response."""
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
