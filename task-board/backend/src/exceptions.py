"""Global exception handlers for consistent structured JSON error responses."""

from __future__ import annotations

import structlog

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = structlog.get_logger(__name__)


def _error_response(
    request: Request,
    status_code: int,
    error: str,
    detail: str,
) -> JSONResponse:
    """Build a structured JSON error response with context from the request."""
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=status_code,
        content={
            "error": error,
            "detail": detail,
            "path": request.url.path,
            "request_id": request_id,
        },
    )


def _http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle standard HTTPException."""
    detail = str(exc.detail) if exc.detail is not None else ""
    return _error_response(
        request,
        status_code=exc.status_code,
        error="http_error",
        detail=detail,
    )


def _validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Handle Pydantic request validation errors (422)."""
    return _error_response(
        request,
        status_code=422,
        error="validation_error",
        detail=str(exc.errors()),
    )


def _generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle any unhandled exception as a 500 Internal Server Error."""
    request_id = getattr(request.state, "request_id", None)
    logger.error(
        "Unhandled exception",
        request_id=request_id,
        path=request.url.path,
        exc_info=exc,
    )
    return _error_response(
        request,
        status_code=500,
        error="internal_error",
        detail="Internal server error",
    )


def add_exception_handlers(app: FastAPI) -> None:
    """Register all global exception handlers on the FastAPI application.

    Handlers are registered in order from most specific to most general.
    """
    app.add_exception_handler(HTTPException, _http_exception_handler)
    app.add_exception_handler(RequestValidationError, _validation_exception_handler)
    app.add_exception_handler(Exception, _generic_exception_handler)
