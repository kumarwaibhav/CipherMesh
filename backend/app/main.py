"""FastAPI ASGI entry point for the CipherMesh privacy control plane."""
from __future__ import annotations

import logging
import re
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.agents.graph import orchestrator_graph
from app.agents.services import get_services
from app.api.routes import router
from app.core.config import get_settings

logger = logging.getLogger("ciphermesh")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
}


_REQUEST_ID = re.compile(r"^[A-Za-z0-9-]{1,64}$")


def request_id_from(value: str | None) -> str:
    """Accept a caller's X-Request-ID only if it is a safe token; otherwise mint one."""
    return value if value and _REQUEST_ID.fullmatch(value) else uuid4().hex[:16]


class BodyLimitMiddleware:
    """Pure-ASGI body cap that counts streamed bytes, so chunked uploads cannot bypass Content-Length."""

    def __init__(self, app, max_bytes: int):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] in ("GET", "HEAD", "OPTIONS"):
            await self.app(scope, receive, send)
            return
        headers = dict(scope.get("headers") or [])
        declared = headers.get(b"content-length", b"")
        if declared.isdigit() and int(declared) > self.max_bytes:
            await self._reject(scope, receive, send, headers)
            return
        chunks, total, more = [], 0, True
        while more:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            total += len(chunk)
            if total > self.max_bytes:
                await self._reject(scope, receive, send, headers)
                return
            chunks.append(chunk)
            more = message.get("more_body", False)
        body, replayed = b"".join(chunks), False

        async def replay():
            nonlocal replayed
            if not replayed:
                replayed = True
                return {"type": "http.request", "body": body, "more_body": False}
            return await receive()

        await self.app(scope, replay, send)

    @staticmethod
    async def _reject(scope, receive, send, headers):
        rid = request_id_from(headers.get(b"x-request-id", b"").decode("latin-1"))
        response = JSONResponse({"detail": "request body too large", "request_id": rid}, status_code=413,
                                headers={"X-Request-ID": rid, **SECURITY_HEADERS})
        await response(scope, receive, send)


@asynccontextmanager
async def lifespan(_: FastAPI):
    services = get_services()
    orchestrator_graph.get_graph()  # compile graph + derive vault key before the first request
    if services.vault.ephemeral:
        logger.warning("CIPHERMESH_VAULT_SEED not set: using an ephemeral vault key (tokens die with the process)")
    if services.settings.cors_origins == ["*"]:
        logger.info("CORS open to all origins without credentials (set CIPHERMESH_CORS_ORIGINS to restrict)")
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version=settings.version, lifespan=lifespan,
                  description="Provider-neutral AI privacy control plane: inspect, seal, route, and audit "
                              "LLM prompts before they cross the organisational boundary.")
    # Starlette wraps later-added middleware around earlier ones: guard (innermost) -> body limit -> CORS
    # (outermost), so 413/429/500 responses still carry CORS headers and browsers can read them.
    @app.middleware("http")
    async def guard(request: Request, call_next):
        request_id = request_id_from(request.headers.get("X-Request-ID"))
        request.state.request_id = request_id
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("unhandled error request_id=%s path=%s", request_id, request.url.path)
            response = JSONResponse({"detail": "internal error", "request_id": request_id}, status_code=500)
        response.headers["X-Request-ID"] = request_id
        for key, value in SECURITY_HEADERS.items():
            if not (key == "Content-Security-Policy" and request.url.path.startswith(("/docs", "/redoc"))):
                response.headers.setdefault(key, value)
        logger.info("%s %s %s %.1fms rid=%s", request.method, request.url.path, response.status_code,
                    (time.perf_counter() - started) * 1000, request_id)
        return response

    app.add_middleware(BodyLimitMiddleware, max_bytes=settings.max_body_bytes)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                       allow_credentials=False, allow_methods=["GET", "POST", "OPTIONS"],
                       allow_headers=["Content-Type", "X-CipherMesh-Token", "X-CipherMesh-Reviewer-Token",
                                      "X-Request-ID"],
                       expose_headers=["X-Request-ID", "Retry-After"], max_age=600)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        # Never echo the submitted prompt back inside validation errors.
        errors = [{"loc": e.get("loc"), "msg": e.get("msg"), "type": e.get("type")} for e in exc.errors()]
        return JSONResponse({"detail": errors}, status_code=422)

    @app.get("/", include_in_schema=False)
    def root():
        return {"service": settings.app_name, "version": settings.version, "docs": "/docs",
                "inspect": "POST /api/v1/inspect"}

    app.include_router(router)
    return app


app = create_app()
