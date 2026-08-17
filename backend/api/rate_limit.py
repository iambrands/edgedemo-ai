"""Lightweight in-process rate limit dependency for demo endpoints."""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, Request

_BUCKETS: dict[str, list[float]] = defaultdict(list)


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if forwarded:
        return forwarded
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def limit_requests(scope: str, max_calls: int, window_seconds: int):
    """Return a dependency callable enforcing a per-IP rolling window limit."""

    async def _dependency(request: Request):
        now = time.time()
        key = f"{scope}:{_client_key(request)}"
        hits = _BUCKETS[key]
        cutoff = now - window_seconds

        while hits and hits[0] < cutoff:
            hits.pop(0)

        if len(hits) >= max_calls:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded for {scope}. Try again later.",
            )

        hits.append(now)

    return _dependency
