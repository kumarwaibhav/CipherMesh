"""Process-wide services the graph nodes depend on (engine, vault, metrics)."""
from __future__ import annotations

import statistics
import threading
import time
from collections import deque
from functools import lru_cache

from ciphermesh.orchestrator import CipherMeshOrchestrator, build_default_orchestrator

from app.core.config import Settings, get_settings
from app.core.security import VaultSecurity


class Metrics:
    def __init__(self, window: int = 2048):
        self._lock = threading.Lock()
        self.requests_total = 0
        self.decisions = {"ALLOW": 0, "REDACT": 0, "REVIEW": 0, "BLOCK": 0}
        self.status_counts: dict[str, int] = {}
        self._latencies: deque[float] = deque(maxlen=window)
        self.started = time.monotonic()

    def record(self, decision: str | None, status: str, total_ms: float) -> None:
        with self._lock:
            self.requests_total += 1
            if decision in self.decisions:
                self.decisions[decision] += 1
            self.status_counts[status] = self.status_counts.get(status, 0) + 1
            self._latencies.append(total_ms)

    def snapshot(self) -> dict:
        with self._lock:
            lat = sorted(self._latencies)
            p95 = lat[max(0, round(0.95 * (len(lat) - 1)))] if lat else 0.0
            return {"requests_total": self.requests_total, "decisions": dict(self.decisions),
                    "status_counts": dict(self.status_counts),
                    "mean_latency_ms": round(statistics.fmean(lat), 3) if lat else 0.0,
                    "p95_latency_ms": round(p95, 3)}

    def uptime_s(self) -> float:
        return round(time.monotonic() - self.started, 1)


class Services:
    def __init__(self, settings: Settings | None = None, vault: VaultSecurity | None = None,
                 orchestrator: CipherMeshOrchestrator | None = None):
        self.settings = settings or get_settings()
        if vault is None and self.settings.is_production and not self.settings.vault_salt:
            raise ValueError("CIPHERMESH_VAULT_SALT is required in production")
        self.vault = vault or VaultSecurity(
            master_seed=self.settings.vault_seed, salt=self.settings.vault_salt,
            iterations=self.settings.vault_iterations, previous_seeds=self.settings.vault_previous_seeds,
            require_seed=self.settings.is_production)
        self.orchestrator = orchestrator or build_default_orchestrator(
            agent_id="CIPHERMESH_CONTROL_PLANE", audit_path=self.settings.audit_path,
            latency_scale=self.settings.latency_scale, review_ttl_s=self.settings.review_ttl_s)
        self.metrics = Metrics()

    @property
    def agent(self):
        return self.orchestrator.agent


_services_lock = threading.Lock()


@lru_cache(maxsize=1)
def _build_services() -> Services:
    return Services()


def get_services() -> Services:
    """Process singleton; the lock stops concurrent cold-start requests from deriving keys twice."""
    with _services_lock:
        return _build_services()


get_services.cache_clear = _build_services.cache_clear  # type: ignore[attr-defined]
