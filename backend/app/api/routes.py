"""Versioned API routes. Graph execution is synchronous (FastAPI runs sync handlers in a threadpool)."""
from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException, Request

from ciphermesh.orchestrator import ProcessOutcome
from ciphermesh.review import ReviewError, ReviewStatus

from app.agents.graph import initial_state, orchestrator_graph, public_response_decision
from app.agents.services import get_services
from app.api.deps import rate_limit, require_reviewer, require_token
from app.api import threat_feed
from app.api.schemas import (GraphOut, HealthOut, InspectRequest, InspectResponse, MetricsOut, ProviderOut,
                             ReviewDecisionRequest, ReviewOut, ThreatFeedOut)
from app.core.security import VaultSecurity

router = APIRouter(prefix="/api/v1", tags=["ciphermesh"], dependencies=[Depends(rate_limit)])


def _vault_block(token: str | None) -> dict | None:
    if not token:
        return None
    d = get_services().vault.describe()
    return {"token_preview": VaultSecurity.preview(token), "sealed_bytes": len(token), "kdf": d.kdf,
            "iterations": d.iterations, "cipher": d.cipher, "key_id": d.key_id}


def _telemetry(logs: list[dict]) -> list[dict]:
    return [{"step": i, **entry} for i, entry in enumerate(logs, start=1)]


@router.post("/inspect", response_model=InspectResponse, dependencies=[Depends(require_token)])
def inspect(body: InspectRequest, request: Request) -> InspectResponse:
    services = get_services()
    started = time.perf_counter()
    request_id = getattr(request.state, "request_id", None)
    state = orchestrator_graph.invoke(initial_state(body.prompt, body.target_provider, request_id))
    total = round((time.perf_counter() - started) * 1000, 3)
    services.metrics.record(state["action_decision"], state["status"], total)
    return InspectResponse(
        request_id=state["request_id"], action_decision=state["action_decision"], status=state["status"],
        target_provider=state["target_provider"], routed_provider=state["routed_provider"],
        processed_prompt=state["processed_prompt"], safe_preview=state["safe_preview"], reasons=state["reasons"],
        findings=state["findings"], review_id=state["review_id"], route=state["route"], response=state["response"],
        vault=_vault_block(state["vault_token"]), telemetry=_telemetry(state["logs"]),
        graph_path=state["graph_path"], timings_ms={**state["timings"], "total_ms": total},
        policy_version=services.agent.state.policy_version)


def _outcome_response(outcome: ProcessOutcome, approved: bool, reviewer: str) -> InspectResponse:
    services = get_services()
    t = outcome.timings_ms.get("total_ms", 0.0)
    logs = [{"node": "review_decision", "event": "APPROVED" if approved else "DENIED",
             "detail": f"{outcome.review_id} decided by {reviewer}", "elapsed_ms": 0.0,
             "level": "success" if approved else "warn"}]
    if outcome.route:
        logs.append({"node": "provider_dispatch", "event": "ROUTE",
                     "detail": f"{outcome.route.status} → {outcome.route.selected} (local tier enforced)",
                     "elapsed_ms": outcome.timings_ms.get("route_ms", 0.0), "level": "success"})
    for a in outcome.attempts:
        logs.append({"node": "provider_dispatch", "event": "ATTEMPT",
                     "detail": f"{a.provider_id} {'ok' if a.ok else 'failed'} ({a.latency_ms:.1f} ms)",
                     "elapsed_ms": a.latency_ms, "level": "success" if a.ok else "warn"})
    logs.append({"node": "review_decision", "event": "COMPLETE", "detail": outcome.status.value, "elapsed_ms": t,
                 "level": "success" if outcome.status.value == "COMPLETED" else "block"})
    services.metrics.record(None, outcome.status.value, t)
    response = None
    if outcome.response_decision is not None:
        response = {"provider": outcome.provider, "text": outcome.response_text,
                    "decision": public_response_decision(outcome.response_decision),
                    "categories": outcome.response_categories}
    return InspectResponse(
        request_id=outcome.request_id, action_decision=outcome.decision.value, status=outcome.status.value,
        target_provider="local" if approved else "none", routed_provider=outcome.provider, processed_prompt=None,
        safe_preview=outcome.safe_preview, reasons=outcome.reasons, findings=[], review_id=outcome.review_id,
        route=outcome.route.model_dump(mode="json") if outcome.route else None, response=response, vault=None,
        telemetry=_telemetry(logs), graph_path=["review_decision"] + (["provider_dispatch"] if outcome.route else []),
        timings_ms=outcome.timings_ms, policy_version=services.agent.state.policy_version)


@router.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    services = get_services()
    return HealthOut(status="ok", version=services.settings.version, graph="compiled",
                     vault="ephemeral" if services.vault.ephemeral else "ready",
                     mode="FORCE_BLOCK_ALL" if services.agent.state.force_block_all else "STRICT",
                     uptime_s=services.metrics.uptime_s())


@router.get("/providers", response_model=list[ProviderOut])
def providers() -> list[ProviderOut]:
    orch = get_services().orchestrator
    orch.contracts.ensure_all(orch.registry.profiles())
    contracts = {r.provider_id: r.price_per_1k_usd for r in orch.contracts.records()}
    health_snapshot = orch.registry.health.snapshot()
    return [ProviderOut(**p.model_dump(include={"provider_id", "display_name", "kind", "region", "data_residency",
                                                "cost_per_1k_requests_usd", "p95_latency_ms", "quality_score",
                                                "availability_pct"}),
                        contract_price_per_1k_usd=contracts.get(p.provider_id),
                        circuit=health_snapshot.get(p.provider_id, {}).get("circuit", "CLOSED"))
            for p in orch.registry.profiles()]


@router.get("/reviews", response_model=list[ReviewOut], dependencies=[Depends(require_reviewer)])
def reviews(status: ReviewStatus | None = None) -> list[ReviewOut]:
    return [ReviewOut(**t.model_dump(include=set(ReviewOut.model_fields)))
            for t in get_services().agent.reviews.list(status)]


@router.post("/reviews/{review_id}/decision", response_model=InspectResponse,
             dependencies=[Depends(require_reviewer)])
def decide(review_id: str, body: ReviewDecisionRequest) -> InspectResponse:
    services = get_services()
    if services.agent.reviews.get(review_id) is None:
        raise HTTPException(status_code=404, detail="unknown or expired review_id")
    try:
        outcome = services.orchestrator.decide_review(review_id, body.approved, body.reviewer)
    except ReviewError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return _outcome_response(outcome, body.approved, body.reviewer)


@router.get("/metrics", response_model=MetricsOut)
def metrics() -> MetricsOut:
    services = get_services()
    pending = sum(t.status == ReviewStatus.PENDING for t in services.agent.reviews.list())
    return MetricsOut(pending_reviews=pending, **services.metrics.snapshot())


@router.get("/graph", response_model=GraphOut)
def graph() -> GraphOut:
    compiled = orchestrator_graph._get()
    cached = _GRAPH_CACHE.get("entry")
    if cached is None or cached[0] is not compiled:
        g = compiled.get_graph()
        out = GraphOut(mermaid=g.draw_mermaid(), nodes=[n for n in g.nodes], edges=[[e.source, e.target] for e in g.edges])
        cached = (compiled, out)
        _GRAPH_CACHE["entry"] = cached  # one atomic swap: concurrent readers never see half an entry
    return cached[1]


_GRAPH_CACHE: dict[str, tuple] = {}


@router.get("/threats/live", response_model=ThreatFeedOut)
def threats_live() -> ThreatFeedOut:
    """Security-relevant AI incident headlines from the AI Incident Database (cached 30 min, fails soft)."""
    return ThreatFeedOut(**threat_feed.get_live())
