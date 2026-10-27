import json

GOOGLE_KEY = "AI" + "za" + "SyD3m0K3yF0rCipherMeshDemo0nly12345"


def test_health_and_root(client):
    health = client.get("/api/v1/health").json()
    assert health["status"] == "ok" and health["graph"] == "compiled" and health["vault"] == "ready"
    assert client.get("/").json()["inspect"] == "POST /api/v1/inspect"


def test_inspect_contract_shape(client):
    r = client.post("/api/v1/inspect", json={"prompt": "mail a@example.com", "target_provider": "auto"})
    assert r.status_code == 200
    body = r.json()
    for key in ("request_id", "action_decision", "status", "routed_provider", "processed_prompt", "findings",
                "route", "response", "vault", "telemetry", "graph_path", "timings_ms", "policy_version"):
        assert key in body
    assert body["action_decision"] == "REDACT" and "a@example.com" not in json.dumps(body)
    assert [t["step"] for t in body["telemetry"]] == list(range(1, len(body["telemetry"]) + 1))
    assert body["vault"]["kdf"] == "PBKDF2-HMAC-SHA256"
    assert r.headers["x-content-type-options"] == "nosniff" and r.headers["x-request-id"]


def test_blocked_response_never_echoes_secret(client):
    body = client.post("/api/v1/inspect", json={"prompt": f"use {GOOGLE_KEY}"}).json()
    assert body["action_decision"] == "BLOCK" and body["processed_prompt"] is None
    assert GOOGLE_KEY not in json.dumps(body)


def test_validation_errors_do_not_echo_prompt(client):
    r = client.post("/api/v1/inspect", json={"prompt": f"{GOOGLE_KEY}", "target_provider": "mars"})
    assert r.status_code == 422 and GOOGLE_KEY not in r.text
    assert client.post("/api/v1/inspect", json={"prompt": "   "}).status_code == 422
    assert client.post("/api/v1/inspect", json={"prompt": "x", "extra": 1}).status_code == 422


def test_body_size_limit(client):
    r = client.post("/api/v1/inspect", content=b"{" + b" " * 500_000 + b"}",
                    headers={"Content-Type": "application/json", "Origin": "https://ui.example"})
    assert r.status_code == 413
    assert r.headers["access-control-allow-origin"] == "*"  # CORS wraps the guard, so browsers can read 413


def test_chunked_body_cannot_bypass_size_limit(client):
    def chunks():
        yield b"{"
        for _ in range(50):
            yield b" " * 10_000
        yield b"}"
    r = client.post("/api/v1/inspect", content=chunks(), headers={"Content-Type": "application/json"})
    assert r.status_code == 413


def test_request_id_is_sanitised_and_matches_body(client):
    r = client.post("/api/v1/inspect", json={"prompt": "hello"}, headers={"X-Request-ID": "trace-42"})
    assert r.headers["x-request-id"] == "trace-42" == r.json()["request_id"]
    bad = client.get("/api/v1/health", headers={"X-Request-ID": "injected<script>"})
    assert "<" not in bad.headers["x-request-id"] and len(bad.headers["x-request-id"]) == 16


def test_block_returns_no_preview(client):
    body = client.post("/api/v1/inspect", json={"prompt": f"key {GOOGLE_KEY} and more context"}).json()
    assert body["action_decision"] == "BLOCK" and body["safe_preview"] is None


def test_review_lifecycle(client):
    pending = client.post("/api/v1/inspect", json={"prompt": "see https://jira.corp.local/1"}).json()
    rid = pending["review_id"]
    assert pending["status"] == "PENDING_REVIEW"
    assert [t["review_id"] for t in client.get("/api/v1/reviews?status=PENDING").json()] == [rid]
    decided = client.post(f"/api/v1/reviews/{rid}/decision", json={"approved": True, "reviewer": "lead"}).json()
    assert decided["status"] == "COMPLETED" and decided["routed_provider"] == "local"
    assert decided["response"]["decision"] in {"ALLOW", "REDACT", "BLOCK"}
    assert client.post(f"/api/v1/reviews/{rid}/decision", json={"approved": True, "reviewer": "lead"}).status_code == 409
    assert client.post("/api/v1/reviews/rev-missing/decision", json={"approved": False, "reviewer": "x"}).status_code == 404


def test_metrics_providers_graph(client):
    client.post("/api/v1/inspect", json={"prompt": "hello there"})
    metrics = client.get("/api/v1/metrics").json()
    assert metrics["requests_total"] >= 1 and metrics["decisions"]["ALLOW"] >= 1
    providers = client.get("/api/v1/providers").json()
    assert {p["provider_id"] for p in providers} == {"local", "aws-bedrock", "azure-ai", "gcp-vertex"}
    assert all(p["contract_price_per_1k_usd"] < p["cost_per_1k_requests_usd"] for p in providers)
    graph = client.get("/api/v1/graph").json()
    assert ["vault_isolation", "review_hold"] in graph["edges"]
    assert "privacy_inspection" in graph["mermaid"] and "review_end" in graph["mermaid"]


def test_cors_open_without_credentials(client):
    r = client.options("/api/v1/inspect", headers={"Origin": "https://ui.example", "Access-Control-Request-Method": "POST"})
    assert r.headers["access-control-allow-origin"] == "*"
    assert "access-control-allow-credentials" not in r.headers


def test_token_guard(client, monkeypatch):
    from app.core import config
    monkeypatch.setenv("CIPHERMESH_API_TOKEN", "t0k")
    config.get_settings.cache_clear()
    assert client.post("/api/v1/inspect", json={"prompt": "hi"}).status_code == 401
    assert client.post("/api/v1/inspect", json={"prompt": "hi"}, headers={"X-CipherMesh-Token": "t0k"}).status_code == 200
    assert client.get("/api/v1/health").status_code == 200


def test_rate_limit(client, monkeypatch):
    from app.api import deps
    from app.core import config
    monkeypatch.setenv("CIPHERMESH_RATE_LIMIT_PER_MIN", "3")
    config.get_settings.cache_clear()
    deps._limiter = None
    codes = [client.post("/api/v1/inspect", json={"prompt": "hi"}).status_code for _ in range(5)]
    assert codes[:3] == [200, 200, 200] and codes[3] == 429


def test_reviewer_token_guards_review_endpoints(client, monkeypatch):
    from app.core import config
    rid = client.post("/api/v1/inspect", json={"prompt": "see https://wiki.corp/x"}).json()["review_id"]
    monkeypatch.setenv("CIPHERMESH_REVIEW_TOKEN", "rev-secret")
    config.get_settings.cache_clear()
    assert client.get("/api/v1/reviews").status_code == 401
    assert client.post(f"/api/v1/reviews/{rid}/decision", json={"approved": True, "reviewer": "x"}).status_code == 401
    ok = {"X-CipherMesh-Reviewer-Token": "rev-secret"}
    assert [t["review_id"] for t in client.get("/api/v1/reviews", headers=ok).json()] == [rid]
    assert client.post(f"/api/v1/reviews/{rid}/decision", json={"approved": False, "reviewer": "lead"},
                       headers=ok).json()["status"] == "DENIED"


def test_production_without_reviewer_token_disables_review_console(client, monkeypatch):
    from app.core import config
    monkeypatch.setenv("CIPHERMESH_ENV", "production")
    config.get_settings.cache_clear()
    assert client.get("/api/v1/reviews").status_code == 403
    assert client.post("/api/v1/reviews/rev-x/decision", json={"approved": True, "reviewer": "x"}).status_code == 403
    assert client.get("/api/v1/metrics").status_code == 200


def test_vault_token_is_persisted_to_audit(client):
    from app.agents.services import get_services
    rid = client.post("/api/v1/inspect", json={"prompt": "mail a@example.com"}).json()["request_id"]
    services = get_services()
    sealed = [e for e in services.agent.audit.recent(50) if e["event_type"] == "vault_sealed" and e["message_id"] == rid]
    assert len(sealed) == 1
    assert "a@example.com" not in services.vault.unseal_state(sealed[0]["details"]["token"])


def test_limiter_lru_cap():
    from app.api.deps import SlidingWindowLimiter
    limiter = SlidingWindowLimiter(5, max_keys=3)
    for k in "abcd":
        limiter.allow(k)
    assert list(limiter._hits) == ["b", "c", "d"]


def test_graph_endpoint_is_safe_under_concurrent_first_requests(client):
    from concurrent.futures import ThreadPoolExecutor

    from app.api import routes

    routes._GRAPH_CACHE.clear()
    with ThreadPoolExecutor(max_workers=8) as pool:
        codes = list(pool.map(lambda _: client.get("/api/v1/graph").status_code, range(16)))
    assert codes == [200] * 16
