import json

import pytest

from app.agents.graph import AgentState, initial_state

GOOGLE_KEY = "AI" + "za" + "SyD3m0K3yF0rCipherMeshDemo0nly12345"


def run(graph, prompt, provider="auto"):
    return graph.invoke(initial_state(prompt, provider))


def test_agent_state_declares_required_fields():
    for field in ("raw_prompt", "target_provider", "action_decision", "processed_prompt", "logs", "findings"):
        assert field in AgentState.__annotations__


@pytest.mark.parametrize("prompt", [
    f"Maps quota error with key {GOOGLE_KEY}",
    "aws_access_key_id = wJalrXUtnFEMIK7MDENG",
    "aws_access_key_id=AKIAIOSFODNN7EXAMPLE",
])
def test_cloud_credentials_block_and_end_on_block_path(graph, prompt):
    state = run(graph, prompt)
    assert state["action_decision"] == "BLOCK" and state["status"] == "BLOCKED"
    assert state["graph_path"] == ["privacy_inspection", "vault_isolation", "block_terminal"]
    assert state["processed_prompt"] is None and state["routed_provider"] is None
    assert state["raw_prompt"] == ""


def test_email_redacted_with_structural_modification(graph):
    state = run(graph, "Forward to rahul.student@example.com today")
    assert state["action_decision"] == "REDACT"
    assert state["processed_prompt"] == "Forward to [REDACTED:EMAIL] today"
    assert state["graph_path"][-1] == "provider_dispatch" and state["status"] == "COMPLETED"


def test_clean_prompt_allowed_unchanged(graph):
    prompt = "Explain the difference between supervised and unsupervised learning."
    state = run(graph, prompt)
    assert state["action_decision"] == "ALLOW" and state["processed_prompt"] == prompt
    assert state["routed_provider"] is not None


def test_review_takes_hold_path_and_transmits_nothing(graph, services):
    state = run(graph, "Summarize logs from https://payments.internal/debug")
    assert state["action_decision"] == "REVIEW" and state["status"] == "PENDING_REVIEW"
    assert state["graph_path"][-1] == "review_hold" and state["processed_prompt"] is None
    assert services.agent.reviews.get(state["review_id"]) is not None


def test_router_contract(graph):
    route = graph.execution_router
    base = initial_state("x")
    assert route({**base, "action_decision": "BLOCK"}) == "block_end"
    assert route({**base, "action_decision": "REDACT"}) == "execute_end"
    assert route({**base, "action_decision": "ALLOW"}) == "execute_end"
    assert route({**base, "action_decision": "REVIEW"}) == "review_end"


def test_vault_seals_findings_without_raw_values(graph, services):
    prompt = f"key {GOOGLE_KEY} and mail a.b@example.com"
    state = run(graph, prompt)
    token = state["vault_token"]
    assert GOOGLE_KEY not in token
    sealed = json.loads(services.vault.unseal_state(token))
    assert sealed["decision"] == "BLOCK" and {f["category"] for f in sealed["findings"]} >= {"google_api_key"}
    assert GOOGLE_KEY not in json.dumps(sealed) and "a.b@example.com" not in json.dumps(sealed)
    assert len(sealed["prompt_hmac"]) == 64


def test_logs_trace_every_node_and_never_contain_secrets(graph):
    state = run(graph, f"key {GOOGLE_KEY}")
    nodes = [entry["node"] for entry in state["logs"]]
    assert nodes[0] == "privacy_inspection" and "vault_isolation" in nodes and nodes[-1] == "block_terminal"
    assert GOOGLE_KEY not in json.dumps(state["logs"])
    assert all({"node", "event", "detail", "level", "elapsed_ms"} <= set(entry) for entry in state["logs"])


def test_india_identifiers_routed_in_country(graph):
    state = run(graph, "KYC for Aadhaar 2345 6789 0124")
    assert state["routed_provider"] in {"aws-bedrock", "azure-ai", "local"}
    gcp = next(e for e in state["route"]["evaluations"] if e["provider_id"] == "gcp-vertex")
    assert not gcp["feasible"]


def test_provider_hint_honoured_when_feasible(graph):
    assert run(graph, "Explain recursion", "azure-ai")["routed_provider"] == "azure-ai"


def test_lockdown_blocks_everything(graph, services):
    services.agent.state.force_block_all = True
    state = run(graph, "hello")
    assert state["action_decision"] == "BLOCK" and state["graph_path"][-1] == "block_terminal"


def test_graph_concurrent_invocations_are_isolated(graph):
    from concurrent.futures import ThreadPoolExecutor
    prompts = [f"mail user{i}@example.com" if i % 2 else f"Explain topic {i}" for i in range(24)]
    with ThreadPoolExecutor(8) as pool:
        states = list(pool.map(lambda p: run(graph, p), prompts))
    for prompt, state in zip(prompts, states, strict=True):
        expected = "REDACT" if "@" in prompt else "ALLOW"
        assert state["action_decision"] == expected
    assert len({s["request_id"] for s in states}) == len(states)


def test_inspection_timing_not_overwritten_by_dispatch(graph):
    out = graph.invoke(initial_state("Email jane.doe@example.com a summary", "auto"))
    assert out["action_decision"] == "REDACT"
    assert out["timings"]["inspect_ms"] > 0
    assert {"vault_ms", "dispatch_ms", "route_ms", "provider_ms"} <= set(out["timings"])
