"""LangGraph deterministic state orchestrator for CipherMesh.

    START -> privacy_inspection -> vault_isolation -> execution_router
                                                       |-- block_end   -> block_terminal   -> END
                                                       |-- review_end  -> review_hold      -> END
                                                       `-- execute_end -> provider_dispatch -> END

The spec's two-way router (block_end / execute_end) is extended with review_end:
REVIEW content must never take the transparent path, otherwise approval-gated
data would be forwarded. Raw prompt text is dropped from state as soon as a
node no longer needs it, and is never written to logs, the vault, or responses.
"""
from __future__ import annotations

import json
import operator
import threading
import time
from typing import Annotated, Any, Literal, TypedDict
from uuid import uuid4

from langgraph.graph import END, START, StateGraph

from ciphermesh.models import AuditEvent, Decision, InspectionResult

from app.agents.services import Services, get_services

ActionDecision = Literal["ALLOW", "REDACT", "REVIEW", "BLOCK"]
RouteKey = Literal["block_end", "review_end", "execute_end"]


def _merge(left: dict, right: dict) -> dict:
    return {**(left or {}), **(right or {})}


class AgentState(TypedDict):
    request_id: str
    raw_prompt: str
    target_provider: str
    action_decision: ActionDecision | None
    processed_prompt: str | None
    safe_preview: str | None
    reasons: list[str]
    findings: list[dict[str, Any]]
    inspection: dict[str, Any] | None
    logs: Annotated[list[dict[str, Any]], operator.add]
    graph_path: Annotated[list[str], operator.add]
    vault_token: str | None
    review_id: str | None
    route: dict[str, Any] | None
    response: dict[str, Any] | None
    routed_provider: str | None
    status: str
    timings: Annotated[dict[str, float], _merge]


def initial_state(prompt: str, target_provider: str = "auto", request_id: str | None = None) -> AgentState:
    return AgentState(request_id=request_id or f"req-{uuid4().hex[:12]}", raw_prompt=prompt,
                      target_provider=target_provider, action_decision=None, processed_prompt=None,
                      safe_preview=None, reasons=[], findings=[], inspection=None, logs=[], graph_path=[],
                      vault_token=None, review_id=None, route=None, response=None, routed_provider=None,
                      status="RECEIVED", timings={})


def public_response_decision(decision: Decision) -> str:
    """Response-side REVIEW findings (e.g. internal URLs) are already masked: report them as REDACT."""
    return "REDACT" if decision == Decision.REVIEW else decision.value


def _log(node: str, event: str, detail: str, started: float, level: str = "info") -> dict[str, Any]:
    return {"node": node, "event": event, "detail": detail, "level": level,
            "elapsed_ms": round((time.perf_counter() - started) * 1000, 3)}


def build_graph(services: Services):
    agent, orchestrator, vault = services.agent, services.orchestrator, services.vault

    def privacy_inspection_node(state: AgentState) -> dict:
        t0 = time.perf_counter()
        node = "privacy_inspection"
        raw = state["raw_prompt"]
        digest = vault.fingerprint(raw)[:16]
        logs = [_log(node, "PERCEIVE", f"{len(raw)} chars · hmac={digest} · target={state['target_provider']}", t0)]
        hint = None if state["target_provider"] == "auto" else state["target_provider"]
        result = agent.inspect(raw, provider=hint, open_review=False)
        findings = [f.model_dump(mode="json") for f in result.findings]
        for f in findings:
            level = "block" if f["severity"] == "CRITICAL" else ("warn" if f["severity"] in {"SENSITIVE", "CONFIDENTIAL"} else "info")
            logs.append(_log(node, "DETECT", f"{f['rule']} {f['category']} [{f['start']}:{f['end']}] "
                                             f"conf={f['confidence']:.2f} via {f['source']}", t0, level))
        if not findings:
            logs.append(_log(node, "DETECT", "no sensitive entities found", t0, "success"))
        decision = result.decision.value
        level = {"ALLOW": "success", "REDACT": "warn", "REVIEW": "warn", "BLOCK": "block"}[decision]
        logs.append(_log(node, "DECISION", f"{decision} · {result.reasons[0]}", t0, level))
        processed = result.sanitized_text if decision == "REDACT" else (raw if decision == "ALLOW" else None)
        preview = None if decision == "BLOCK" else result.safe_preview  # never echo any part of a blocked prompt
        return {"action_decision": decision, "processed_prompt": processed, "safe_preview": preview,
                "reasons": list(result.reasons), "findings": findings,
                "inspection": result.model_dump(mode="json"), "logs": logs, "graph_path": [node],
                "timings": {"inspect_ms": round((time.perf_counter() - t0) * 1000, 3)}}

    def vault_isolation_node(state: AgentState) -> dict:
        t0 = time.perf_counter()
        node = "vault_isolation"
        envelope = json.dumps({
            "request_id": state["request_id"], "decision": state["action_decision"],
            "reasons": state["reasons"], "findings": state["findings"],
            "prompt_hmac": vault.fingerprint(state["raw_prompt"]),
            "target_provider": state["target_provider"], "sealed_at": time.time(),
        }, sort_keys=True, separators=(",", ":"))
        token = vault.seal_state(envelope)
        verified = vault.unseal_state(token) == envelope
        d = vault.describe()
        agent.audit.write(AuditEvent(agent_id=agent.state.agent_id, event_type="vault_sealed",
                                     decision=Decision(state["action_decision"]),
                                     categories=[f["category"] for f in state["findings"]],
                                     message_id=state["request_id"], details={"key_id": d.key_id, "token": token}))
        logs = [_log(node, "SEAL", f"{len(state['findings'])} findings + execution details sealed · "
                                   f"{len(token)} B · {d.kdf} x{d.iterations:,} · key {d.key_id}", t0),
                _log(node, "VERIFY", "round-trip unseal matches (integrity + authenticity OK)" if verified
                     else "round-trip mismatch", t0, "success" if verified else "block")]
        update: dict[str, Any] = {"vault_token": token, "logs": logs, "graph_path": [node],
                                  "timings": {"vault_ms": round((time.perf_counter() - t0) * 1000, 3)}}
        if state["action_decision"] == "BLOCK":
            update["raw_prompt"] = ""
        return update

    def execution_router(state: AgentState) -> RouteKey:
        decision = state["action_decision"]
        if decision == "BLOCK":
            return "block_end"
        if decision == "REVIEW":
            return "review_end"
        return "execute_end"

    def block_terminal_node(state: AgentState) -> dict:
        t0 = time.perf_counter()
        node = "block_terminal"
        categories = sorted({f["category"] for f in state["findings"]})
        detail = ("emergency lockdown active" if not categories
                  else f"transmission refused · revoke/rotate exposed credential(s): {', '.join(categories)}")
        return {"status": "BLOCKED", "processed_prompt": None, "raw_prompt": "", "graph_path": [node],
                "logs": [_log(node, "BLOCKED", detail, t0, "block")]}

    def review_hold_node(state: AgentState) -> dict:
        t0 = time.perf_counter()
        node = "review_hold"
        hint = None if state["target_provider"] == "auto" else state["target_provider"]
        try:
            ticket = agent.reviews.submit(state["raw_prompt"], [f["category"] for f in state["findings"]],
                                          state["reasons"], state["safe_preview"], hint)
        except Exception as exc:  # queue full or invalid -> fail closed
            return {"status": "BLOCKED", "action_decision": "BLOCK", "processed_prompt": None, "raw_prompt": "",
                    "graph_path": [node], "logs": [_log(node, "FAIL_CLOSED", str(exc), t0, "block")]}
        return {"status": "PENDING_REVIEW", "review_id": ticket.review_id, "processed_prompt": None,
                "raw_prompt": "", "graph_path": [node],
                "logs": [_log(node, "HOLD", f"ticket {ticket.review_id} queued · nothing transmitted · "
                                            f"approval releases to local tier only", t0, "warn")]}

    def provider_dispatch_node(state: AgentState) -> dict:
        t0 = time.perf_counter()
        node = "provider_dispatch"
        inspection = InspectionResult.model_validate(state["inspection"])
        hint = None if state["target_provider"] == "auto" else state["target_provider"]
        outcome = orchestrator.dispatch(state["processed_prompt"] or "", inspection, hint, state["request_id"])
        logs: list[dict] = []
        prices = {r.provider_id: r.price_per_1k_usd for r in orchestrator.contracts.records()}
        logs.append(_log(node, "PROCURE", "contract-net prices: " + ", ".join(
            f"{k}=${v:.2f}" for k, v in prices.items() if v is not None), t0))
        route = outcome.route.model_dump(mode="json") if outcome.route else None
        if route:
            excluded = [f"{e['provider_id']}({'; '.join(e['reasons'])})" for e in route["evaluations"] if not e["feasible"]]
            logs.append(_log(node, "ROUTE", f"{route['status']} → {route['selected']} "
                                            f"U={route['utility']} · ranking {' > '.join(route['ranking']) or '-'}"
                                            + (f" · excluded {', '.join(excluded)}" if excluded else ""), t0,
                             "success" if route["status"] == "SELECTED" else "block"))
            for note in route["notes"]:
                logs.append(_log(node, "POLICY", note, t0, "warn"))
        for a in outcome.attempts:
            logs.append(_log(node, "ATTEMPT", f"{a.provider_id} {'ok' if a.ok else 'failed: ' + (a.error or '')} "
                                              f"({a.latency_ms:.1f} ms)", t0, "success" if a.ok else "warn"))
        response = None
        if outcome.response_decision is not None:
            response = {"provider": outcome.provider, "text": outcome.response_text,
                        "decision": public_response_decision(outcome.response_decision),
                        "categories": outcome.response_categories}
            logs.append(_log(node, "RESPONSE_INSPECT", f"{response['decision']}"
                                                       + (f" ({', '.join(outcome.response_categories)})"
                                                          if outcome.response_categories else " · clean"), t0,
                             "block" if outcome.response_decision == Decision.BLOCK else "success"))
        logs.append(_log(node, "COMPLETE", outcome.status.value, t0,
                         "success" if outcome.status.value == "COMPLETED" else "block"))
        return {"status": outcome.status.value, "routed_provider": outcome.provider, "route": route,
                "response": response, "raw_prompt": "", "graph_path": [node], "logs": logs,
                "timings": {"dispatch_ms": round((time.perf_counter() - t0) * 1000, 3),
                            **{k: v for k, v in outcome.timings_ms.items() if k not in ("total_ms", "inspect_ms")}}}

    graph = StateGraph(AgentState)
    graph.add_node("privacy_inspection", privacy_inspection_node)
    graph.add_node("vault_isolation", vault_isolation_node)
    graph.add_node("block_terminal", block_terminal_node)
    graph.add_node("review_hold", review_hold_node)
    graph.add_node("provider_dispatch", provider_dispatch_node)
    graph.add_edge(START, "privacy_inspection")
    graph.add_edge("privacy_inspection", "vault_isolation")
    graph.add_conditional_edges("vault_isolation", execution_router,
                                {"block_end": "block_terminal", "review_end": "review_hold",
                                 "execute_end": "provider_dispatch"})
    for terminal in ("block_terminal", "review_hold", "provider_dispatch"):
        graph.add_edge(terminal, END)
    compiled = graph.compile()
    compiled.execution_router = execution_router  # exposed for direct unit testing
    return compiled


class _LazyGraph:
    """Compile on first use so importing the module never derives keys at import time."""

    def __init__(self):
        self._graph = None
        self._lock = threading.Lock()

    def _get(self):
        graph = self._graph
        if graph is None:
            with self._lock:
                if self._graph is None:
                    self._graph = build_graph(get_services())
                graph = self._graph
        return graph

    def reset(self) -> None:
        with self._lock:
            self._graph = None

    def __getattr__(self, item):
        return getattr(self._get(), item)


orchestrator_graph = _LazyGraph()

__all__ = ["AgentState", "build_graph", "initial_state", "orchestrator_graph"]
