# CipherMesh API contract (v1)

Base URL: `NEXT_PUBLIC_API_BASE_URL` (default `http://127.0.0.1:8000`). All bodies are JSON.
`POST /inspect` accepts an optional `X-CipherMesh-Token` header (required only when the server sets `CIPHERMESH_API_TOKEN`).
The review endpoints require `X-CipherMesh-Reviewer-Token` when the server sets `CIPHERMESH_REVIEW_TOKEN` (`401` if missing or wrong); a production server without a reviewer token disables them (`403`).
Every response carries `X-Request-ID`. A caller-supplied `X-Request-ID` matching `[A-Za-z0-9-]{1,64}` is reused; for `/inspect` the body `request_id` equals this header.
All `/api/v1` routes are rate-limited per client (`429` with `Retry-After`).

## POST /api/v1/inspect

Request
```json
{ "prompt": "string, 1..65536 chars", "target_provider": "auto | aws-bedrock | azure-ai | gcp-vertex | local" }
```

Response `200`
```json
{
  "request_id": "req-3f2a9c1d7b44",
  "action_decision": "ALLOW | REDACT | REVIEW | BLOCK",
  "status": "COMPLETED | BLOCKED | PENDING_REVIEW | DENIED | NO_ROUTE | PROVIDER_FAILED | RESPONSE_BLOCKED",
  "target_provider": "auto",
  "routed_provider": "aws-bedrock | null",
  "processed_prompt": "sanitized text actually forwarded, or null when nothing is forwarded",
  "safe_preview": "redacted preview for display; always null for BLOCK",
  "reasons": ["R2: PII or custom redaction pattern detected; sanitize before transmission"],
  "findings": [
    { "category": "email", "rule": "D5", "severity": "SENSITIVE", "start": 6, "end": 24,
      "confidence": 0.95, "source": "regex" }
  ],
  "review_id": "rev-91c64d16f7a9 | null",
  "route": {
    "status": "SELECTED | NO_FEASIBLE_ROUTE",
    "selected": "aws-bedrock",
    "utility": 77.28,
    "ranking": ["aws-bedrock", "azure-ai", "local"],
    "evaluations": [
      { "provider_id": "gcp-vertex", "feasible": false, "utility": 77.93, "effective_cost": 1.79,
        "priced_by": "negotiated_contract", "reasons": ["RESIDENCY_NOT_ALLOWED: US"] }
    ],
    "notes": ["India personal-data identifiers detected: in-country or local processing only"]
  },
  "response": { "provider": "aws-bedrock", "text": "model reply after response-side inspection",
                "decision": "ALLOW | REDACT | BLOCK", "categories": [] },
  "vault": { "token_preview": "gAAAAABn…f3Q=", "sealed_bytes": 412, "kdf": "PBKDF2-HMAC-SHA256",
             "iterations": 600000, "cipher": "Fernet (AES-128-CBC + HMAC-SHA256)", "key_id": "k1-9c2e" },
  "telemetry": [
    { "step": 1, "node": "privacy_inspection", "event": "DECISION", "detail": "REDACT via R2 (email)",
      "elapsed_ms": 0.21, "level": "info | warn | block | success" }
  ],
  "graph_path": ["privacy_inspection", "vault_isolation", "provider_dispatch"],
  "timings_ms": { "total_ms": 3.4 },
  "policy_version": "1.0"
}
```
`422` on validation errors (submitted values are never echoed), `413` if the body exceeds `CIPHERMESH_MAX_BODY_BYTES` (streamed bytes are counted, so chunked uploads are capped too), `429` when rate-limited.

## GET /api/v1/health
`{ "status": "ok", "version": "2.0.0", "graph": "compiled", "vault": "ready", "mode": "STRICT", "uptime_s": 12.3 }`

## GET /api/v1/providers
`[{ "provider_id", "display_name", "kind": "cloud|local", "region", "data_residency": "IN|US|EU|LOCAL", "cost_per_1k_requests_usd", "contract_price_per_1k_usd": number|null, "p95_latency_ms", "quality_score", "availability_pct", "circuit": "CLOSED|OPEN" }]`

## GET /api/v1/reviews?status=PENDING  (reviewer token)
`[{ "review_id", "created_at", "expires_at", "status", "categories": [], "reasons": [], "safe_preview", "requested_provider" }]`

## POST /api/v1/reviews/{review_id}/decision  (reviewer token)
Request `{ "approved": true, "reviewer": "security-lead" }` → same shape as `/inspect` response, with `action_decision: "REVIEW"`, `request_id` = the review id, and `status` `COMPLETED` (released to the **local** tier only), `DENIED`, or `BLOCKED` (re-inspection blocked it). `409` if already decided/expired, `404` if unknown or expired.
Tickets live in the memory of the instance that created them; on serverless hosting a recycled instance loses pending tickets (see README).

## GET /api/v1/metrics
`{ "requests_total", "decisions": {"ALLOW":0,"REDACT":0,"REVIEW":0,"BLOCK":0}, "status_counts": {}, "pending_reviews", "mean_latency_ms", "p95_latency_ms" }`

## GET /api/v1/graph
`{ "mermaid": "flowchart ...", "nodes": ["privacy_inspection", ...], "edges": [["privacy_inspection","vault_isolation"], ...] }`
