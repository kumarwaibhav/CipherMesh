# CipherMesh v2.0 — audit log

Two independent reviewers audited the build: one for backend security and code quality, one for frontend quality and accessibility. Neither had written the code they reviewed. Both probed the live deployment as well as the source. Every finding below was fixed and re-verified against the live service unless it is marked as accepted.

## Backend (security / correctness)

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| H1 | High | Anyone could approve or deny held prompts; the approval route had no credential in production | New `X-CipherMesh-Reviewer-Token` (`CIPHERMESH_REVIEW_TOKEN`). Production without it returns 403. Live check: no token gives 401; the right token approves |
| H2 | High | `GET /reviews` exposed the context of held prompts to anyone | Same reviewer guard on the listing (live: 401 without the token) |
| H3 | High | The review queue is in memory, which doesn't survive serverless instance recycling | **Accepted for the demo**, documented in the README and contract; 404 now reads "unknown or expired". The container deployment keeps state; the durable path is Redis/Postgres with vault-sealed held text |
| M1 | Medium | A chunked request body bypassed the 413 guard | Pure-ASGI `BodyLimitMiddleware` counts streamed bytes (live: chunked 500 KB gives 413) |
| M2 | Medium | Rate-limit key was wrong behind proxies; key store had no cap; GET routes weren't limited | Vercel edge headers are trusted only on Vercel; uvicorn uses `--forwarded-allow-ips`; LRU key cap; limiter applies to the whole router |
| M3 | Medium | Singleton race at cold start (key derived twice, split review queues) | Locked `get_services()`, double-checked lock in `_LazyGraph` and on the limiter |
| M4 | Medium | Sealed vault token was never stored, so nothing could unseal it | Each token is written to the audit log (`vault_sealed`, keyed by request ID); test unseals it |
| M5 | Medium | Contract drift: `DENIED` status, `REVIEW` as a response decision, request ID mismatch | Contract updated; response-side REVIEW is reported as REDACT; body `request_id` now equals `X-Request-ID` |
| L1 | Low | BLOCK responses returned `safe_preview` (could expose secret fragments the detector missed) | `safe_preview` is `null` on BLOCK (live verified) |
| L2 | Low | Unsalted SHA-256 prompt hash in telemetry | Keyed HMAC fingerprint derived from the vault key |
| L3 | Low | Caller `X-Request-ID` echoed back unsanitised | Allow-list `[A-Za-z0-9-]{1,64}`; anything else is replaced |
| L4 | Low | Guard responses (413/500) lacked CORS headers | Middleware order changed so CORS is outermost (test asserts it) |
| L5 | Low | Salt optional in production; previous seeds skipped the length check | Both enforced. `/docs` stays public on purpose, as a demo convenience |
| L6 | Low | Body limit lower than the worst-case JSON-escaped 65,536-character prompt | Default raised to 400,000 bytes |

The reviewer confirmed these were already correct:
- Validation errors never echo input.
- Raw prompt is cleared at every terminal node.
- Reducers are correct.
- Fernet/PBKDF2 setup and rotation are sound.
- Token comparison is constant-time.
- Approved reviews are re-inspected and kept to the local tier.
- A full review queue fails closed.
- CORS sends no credentials.
- The audit log holds metadata only.

## Frontend (quality / accessibility)

Build gates passed before and after the fixes: `npm ci`, `lint`, `tsc --noEmit` and `next build`. Playwright drove the live API at 1440 px and 390 px, checking:
- Decision colours: ALLOW emerald, REDACT amber, REVIEW sky, BLOCK red.
- No secret rendered anywhere.
- No horizontal overflow at 390 px.
- No console errors.

| Finding | Resolution |
|---|---|
| Card after an approved review still said "held" | Explanation now depends on status as well as decision (COMPLETED, DENIED, BLOCKED and others) |
| Scroll regions not keyboard-reachable (axe `scrollable-region-focusable`) | `tabIndex=0`, `role="region"`, labels, focus ring |
| Terminal text contrast 4.09:1 | `zinc-400` (about 7:1) |
| Invalid `<dl>` markup in the vault panel | `KeyValue` takes a `className`; wrapper divs removed |
| Diagrams illegible on phones | Open-full-size links and a horizontally scrollable region below `sm` |
| No `<h1>` | Screen-reader-only heading |
| `next start` vs `output: standalone` | Standalone output only in the Docker build |
| Heavy polling, duplicate fetch after a decision | 15 s interval, paused while the tab is hidden; duplicate removed |
| Terminal flooded screen readers | Log set to `aria-live="off"`; the decision card announces |
| "Requested: None" | Falls back to "Auto-route" |
| No frontend security headers | CSP, nosniff, `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy |
| Raw HTML in the Mermaid source | Tags stripped and entities decoded, shown as text |
| New: reviewer token | Separate settings field; the review queue shows a locked or disabled state |

## Test evidence

- Backend: `python -m pytest`, **161 passed**. Covers vault, graph, API, engine, the new auth/body-limit/request-ID tests, and LRU.
- Frontend: lint, typecheck and production build pass. Playwright smoke at 1440 px and 390 px.
- Live: every decision path, review approval, auth, chunked 413 with CORS, request-ID sanitisation and the health check were verified against https://ciphermesh-api.vercel.app.

## Interface pass (v2.2): glass, guided, accessible

| Check | Tool | Result |
|:--|:--|:--|
| Text contrast measured on the real rendered glass (pixel sampling under every text run), light + dark, 1280 px + 390 px, 11 screens and states | Playwright + custom sampler | 1,979 runs, 0 below WCAG AA |
| Names, labels, roles, ARIA, landmarks, dialogs | axe-core 4.10 (all rules except contrast, which axe cannot measure through backdrop blur) | 0 violations on every screen, both themes, both widths |
| Horizontal overflow | Playwright | 0 px everywhere |
| Full flow: example → result → Approvals → approve → result | Playwright | Pass, no console errors |
| Theme: light, dark, match device; no flash on load | Playwright | Pass |
| Reduced transparency and browsers without backdrop blur | CSS fallbacks | Panels become near-opaque |
| Backend regression | pytest | 161 passed |
| Frontend | ESLint, `tsc --noEmit`, `next build` | Pass |

Usability design: one primary action per screen; clickable examples that run instantly; a progress guide; a three-step tour; plain-language results with a next step; "your text vs what the AI receives" side by side; technical detail folded away for engineers; an iOS tab bar on phones; inline sign-in on Approvals instead of a hidden settings page.

The brand guidelines page was removed from the app and kept as an internal document: [`docs/brand/BRAND.md`](brand/BRAND.md).
