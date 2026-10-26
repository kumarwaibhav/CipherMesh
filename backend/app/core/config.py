"""Runtime configuration read once from the environment (12-factor)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache


def _csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = "CipherMesh Privacy Control Plane"
    version: str = "2.0.0"
    environment: str = field(default_factory=lambda: os.getenv("CIPHERMESH_ENV", "development"))
    vault_seed: str | None = field(default_factory=lambda: os.getenv("CIPHERMESH_VAULT_SEED") or None)
    vault_salt: str | None = field(default_factory=lambda: os.getenv("CIPHERMESH_VAULT_SALT") or None)
    vault_previous_seeds: tuple[str, ...] = field(
        default_factory=lambda: tuple(_csv(os.getenv("CIPHERMESH_VAULT_PREVIOUS_SEEDS", ""))))
    vault_iterations: int = field(default_factory=lambda: int(os.getenv("CIPHERMESH_VAULT_ITERATIONS", "600000")))
    api_token: str = field(default_factory=lambda: os.getenv("CIPHERMESH_API_TOKEN", ""))
    review_token: str = field(default_factory=lambda: os.getenv("CIPHERMESH_REVIEW_TOKEN", ""))
    cors_origins: list[str] = field(default_factory=lambda: _csv(os.getenv("CIPHERMESH_CORS_ORIGINS", "*")))
    rate_limit_per_minute: int = field(default_factory=lambda: int(os.getenv("CIPHERMESH_RATE_LIMIT_PER_MIN", "120")))
    max_body_bytes: int = field(default_factory=lambda: int(os.getenv("CIPHERMESH_MAX_BODY_BYTES", "400000")))
    max_prompt_chars: int = 65536
    latency_scale: float = field(default_factory=lambda: float(os.getenv("CIPHERMESH_LATENCY_SCALE", "0.02")))
    audit_path: str = field(default_factory=lambda: os.getenv("CIPHERMESH_AUDIT_PATH", ":memory:"))
    review_ttl_s: float = field(default_factory=lambda: float(os.getenv("CIPHERMESH_REVIEW_TTL_S", "900")))

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
