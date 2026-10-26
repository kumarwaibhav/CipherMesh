# CipherMesh frontend

Next.js 14 (App Router) console for the CipherMesh AI privacy control plane. It sends prompts to the
CipherMesh API, shows the ALLOW / REDACT / REVIEW / BLOCK decision, what the provider actually receives,
detector findings, utility routing, vault metadata, the LangGraph telemetry trace and the human review queue.

## Run locally

```bash
cp .env.example .env.local      # point NEXT_PUBLIC_API_BASE_URL at the backend
npm install
npm run dev                     # http://localhost:3000
```

The backend must allow this origin via CORS and accept the `X-CipherMesh-Token` and
`X-CipherMesh-Reviewer-Token` headers. Both tokens are entered from the gear icon in the header and stored in this
browser's localStorage only:

- **API token** (`X-CipherMesh-Token`) — needed when the server sets `CIPHERMESH_API_TOKEN`; sent on every call.
- **Reviewer token** (`X-CipherMesh-Reviewer-Token`) — sent only to `GET /api/v1/reviews` and
  `POST /api/v1/reviews/{id}/decision`. Without it the review queue shows a locked state (401); if the deployment
  has no reviewer token configured the queue shows "Review console disabled on this deployment" (403). While
  locked, the queue stops polling until a token is saved. The pending count comes from the public `/metrics`.

Polling (health, metrics, reviews) runs every 15 s and pauses while the tab is hidden. The architecture page checks
health once instead of polling.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (default output; `NEXT_OUTPUT=standalone` switches to standalone) |
| `npm run start` | Serve the production build (`next start`) |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm run typecheck` | `tsc --noEmit` |

## Docker

```bash
docker build --build-arg NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 -t ciphermesh-frontend .
docker run --rm -p 3000:3000 ciphermesh-frontend
```

`NEXT_PUBLIC_API_BASE_URL` is inlined at build time, so pass it as a build argument. The Dockerfile sets
`NEXT_OUTPUT=standalone` in the builder stage, so only the image uses `output: "standalone"` (served by
`node server.js`); local `npm run start` and Vercel builds use the default output.

## Security headers

`next.config.mjs` sends `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
`X-Frame-Options: DENY` and a `Permissions-Policy` that disables camera, microphone and geolocation. The CSP
`connect-src` is `'self'` plus the origin of `NEXT_PUBLIC_API_BASE_URL` at build time (default
`http://127.0.0.1:8000`), so rebuild after changing the API URL. `script-src` includes `'unsafe-inline'` because
Next.js emits inline bootstrap scripts and no nonce is configured.

## Layout

- `app/page.tsx` — console (components in `app/components/`)
- `app/architecture/page.tsx` — diagrams from `public/diagrams/*.svg` plus the live Mermaid graph
- `lib/api.ts` — typed fetch client mirroring `docs/API_CONTRACT.md`
