"""Pydantic request/response schemas for the public API (mirrors docs/API_CONTRACT.md)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ProviderChoice = Literal["auto", "aws-bedrock", "azure-ai", "gcp-vertex", "local"]
DecisionLiteral = Literal["ALLOW", "REDACT", "REVIEW", "BLOCK"]
LevelLiteral = Literal["info", "warn", "block", "success"]


class InspectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)
    prompt: str = Field(min_length=1, max_length=65536, description="Prompt text to inspect before any provider call")
    target_provider: ProviderChoice = "auto"

    @field_validator("prompt")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("prompt must contain non-whitespace characters")
        return value


class FindingOut(BaseModel):
    category: str
    rule: str
    severity: str
    start: int
    end: int
    confidence: float
    source: str


class RouteEvaluationOut(BaseModel):
    provider_id: str
    feasible: bool
    utility: float
    effective_cost: float
    priced_by: str
    reasons: list[str]


class RouteOut(BaseModel):
    status: str
    selected: str | None
    utility: float | None
    ranking: list[str]
    evaluations: list[RouteEvaluationOut]
    notes: list[str]


class ModelResponseOut(BaseModel):
    provider: str | None
    text: str | None
    decision: DecisionLiteral
    categories: list[str]


class VaultOut(BaseModel):
    token_preview: str
    sealed_bytes: int
    kdf: str
    iterations: int
    cipher: str
    key_id: str


class TelemetryStep(BaseModel):
    step: int
    node: str
    event: str
    detail: str
    elapsed_ms: float
    level: LevelLiteral


class InspectResponse(BaseModel):
    request_id: str
    action_decision: DecisionLiteral
    status: str
    target_provider: str
    routed_provider: str | None
    processed_prompt: str | None
    safe_preview: str | None
    reasons: list[str]
    findings: list[FindingOut]
    review_id: str | None
    route: RouteOut | None
    response: ModelResponseOut | None
    vault: VaultOut | None
    telemetry: list[TelemetryStep]
    graph_path: list[str]
    timings_ms: dict[str, float]
    policy_version: str


class ReviewDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    approved: bool
    reviewer: str = Field(min_length=1, max_length=128)


class ReviewOut(BaseModel):
    review_id: str
    created_at: datetime
    expires_at: datetime
    status: str
    categories: list[str]
    reasons: list[str]
    safe_preview: str | None
    requested_provider: str | None


class HealthOut(BaseModel):
    status: str
    version: str
    graph: str
    vault: str
    mode: str
    uptime_s: float


class ProviderOut(BaseModel):
    provider_id: str
    display_name: str
    kind: str
    region: str
    data_residency: str
    cost_per_1k_requests_usd: float
    contract_price_per_1k_usd: float | None
    p95_latency_ms: float
    quality_score: float
    availability_pct: float
    circuit: str


class MetricsOut(BaseModel):
    requests_total: int
    decisions: dict[str, int]
    status_counts: dict[str, int]
    pending_reviews: int
    mean_latency_ms: float
    p95_latency_ms: float


class GraphOut(BaseModel):
    mermaid: str
    nodes: list[str]
    edges: list[list[str]]


class ErrorOut(BaseModel):
    detail: str
    request_id: str | None = None
