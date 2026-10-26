"""Cross-cutting request guards: API token, reviewer token and per-client rate limiting."""
from __future__ import annotations

import hmac
import os
import threading
import time
from collections import OrderedDict, deque

from fastapi import Header, HTTPException, Request

from app.core.config import get_settings


def require_token(x_ciphermesh_token: str | None = Header(default=None)) -> None:
    expected = get_settings().api_token
    if expected and not hmac.compare_digest(x_ciphermesh_token or "", expected):
        raise HTTPException(status_code=401, detail="missing or invalid X-CipherMesh-Token")


def require_reviewer(x_ciphermesh_reviewer_token: str | None = Header(default=None)) -> None:
    """Review endpoints expose held context and release it, so they need their own credential.

    Production without CIPHERMESH_REVIEW_TOKEN disables the review console entirely (fail closed);
    development without it stays open for local use.
    """
    settings = get_settings()
    expected = settings.review_token
    if not expected:
        if settings.is_production:
            raise HTTPException(status_code=403, detail="review console disabled on this deployment")
        return
    if not hmac.compare_digest(x_ciphermesh_reviewer_token or "", expected):
        raise HTTPException(status_code=401, detail="reviewer token required")


class SlidingWindowLimiter:
    """Per-key sliding 60 s window with a hard LRU key cap. In-memory: per process/instance."""

    def __init__(self, limit_per_minute: int, max_keys: int = 10_000):
        self.limit = limit_per_minute
        self.max_keys = max_keys
        self._hits: OrderedDict[str, deque[float]] = OrderedDict()
        self._lock = threading.Lock()

    def allow(self, key: str) -> tuple[bool, int]:
        now = time.monotonic()
        with self._lock:
            window = self._hits.get(key)
            if window is None:
                window = self._hits[key] = deque()
                while len(self._hits) > self.max_keys:
                    self._hits.popitem(last=False)
            else:
                self._hits.move_to_end(key)
            while window and now - window[0] > 60:
                window.popleft()
            if len(window) >= self.limit:
                return False, max(1, int(60 - (now - window[0])) + 1)
            window.append(now)
            return True, 0


_limiter: SlidingWindowLimiter | None = None
_limiter_lock = threading.Lock()


def client_key(request: Request) -> str:
    """Client identity for rate limiting. On Vercel the edge overwrites these headers, so they are trusted
    there; elsewhere uvicorn's --proxy-headers / --forwarded-allow-ips decide what request.client holds."""
    if os.getenv("VERCEL"):
        for header in ("x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"):
            value = request.headers.get(header)
            if value:
                return value.split(",")[0].strip()[:64]
    return request.client.host if request.client else "unknown"


def rate_limit(request: Request) -> None:
    global _limiter
    settings = get_settings()
    if settings.rate_limit_per_minute <= 0:
        return
    with _limiter_lock:
        if _limiter is None or _limiter.limit != settings.rate_limit_per_minute:
            _limiter = SlidingWindowLimiter(settings.rate_limit_per_minute)
        limiter = _limiter
    allowed, retry_after = limiter.allow(client_key(request))
    if not allowed:
        raise HTTPException(status_code=429, detail="rate limit exceeded",
                            headers={"Retry-After": str(retry_after)})
