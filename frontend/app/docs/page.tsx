import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Code } from "../components/site";
import { CodeTabs, DocsToc } from "../components/DocsWidgets";

export const metadata: Metadata = {
  title: "Documentation",
  description: "CipherMesh documentation: quickstart, concepts, the full API reference, authentication, errors and limits, configuration and the security model.",
};

const API = "https://ciphermesh-api.vercel.app/api/v1";

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "quickstart", label: "Quickstart" },
  { id: "modes", label: "Integration Modes" },
  { id: "concepts", label: "Concepts" },
  { id: "decisions", label: "Decisions & Statuses", sub: true },
  { id: "categories", label: "Detection Categories", sub: true },
  { id: "routing-docs", label: "Routing & Residency", sub: true },
  { id: "approvals-docs", label: "Approvals", sub: true },
  { id: "api", label: "API Reference" },
  { id: "ep-inspect", label: "POST /inspect", sub: true },
  { id: "ep-reviews", label: "Reviews", sub: true },
  { id: "ep-system", label: "System Endpoints", sub: true },
  { id: "auth", label: "Authentication" },
  { id: "errors", label: "Errors & Limits" },
  { id: "config", label: "Configuration" },
  { id: "security", label: "Security Model" },
  { id: "changelog", label: "Changelog" },
] as const;

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-28 text-[28px] font-bold tracking-[-0.02em] text-label">
      <a href={`#${id}`} className="hover:underline">
        {children}
      </a>
    </h2>
  );
}

function H3({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mt-10 scroll-mt-28 text-[20px] font-semibold tracking-[-0.01em] text-label">
      {children}
    </h3>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[16px] leading-[1.7] text-label-2">{children}</p>;
}

function C({ children }: { children: ReactNode }) {
  return <code className="rounded-md bg-[var(--fill)] px-1.5 py-0.5 font-mono text-[0.88em] text-label">{children}</code>;
}

function Table({ head, rows }: { head: string[]; rows: ReadonlyArray<ReadonlyArray<ReactNode>> }) {
  return (
    <div className="surface scrollbar-thin mt-4 overflow-x-auto rounded-2xl" tabIndex={0} role="region" aria-label={`${head.join(", ")} table`}>
      <table className="w-full min-w-[560px] text-left text-[14px]">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="sep border-b px-4 py-3 text-[12px] font-semibold text-label-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="align-top">
          {rows.map((r, i) => (
            <tr key={i} className="sep border-b last:border-0">
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-4 py-3 font-semibold text-label">
                    {c}
                  </th>
                ) : (
                  <td key={j} className="px-4 py-3 leading-relaxed text-label-2">
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Endpoint({ id, method, path, auth, children }: { id?: string; method: "GET" | "POST"; path: string; auth: string; children: ReactNode }) {
  return (
    <section id={id} aria-label={`${method} ${path}`} className="surface mt-4 scroll-mt-28 rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 font-mono text-[12px] font-bold ${method === "POST" ? "bg-[rgb(var(--accent)/0.14)] text-accent-text" : "bg-[rgb(var(--allow)/0.16)] text-allow-text"}`}>{method}</span>
        <code className="font-mono text-[14px] font-semibold text-label">{path}</code>
        <span className="ml-auto text-[12px] text-label-2">{auth}</span>
      </div>
      <div className="mt-2 text-[15px] leading-relaxed text-label-2">{children}</div>
    </section>
  );
}

const QUICK = [
  {
    lang: "curl",
    code: `curl -X POST ${API}/inspect \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Email ananya.rao@example.com about her refund", "target_provider": "auto"}'`,
  },
  {
    lang: "Python",
    code: `import requests

API = "${API}"

def safe_prompt(prompt: str, target: str = "auto") -> str | None:
    r = requests.post(f"{API}/inspect", json={"prompt": prompt, "target_provider": target}, timeout=10)
    r.raise_for_status()
    result = r.json()
    if result["action_decision"] in ("ALLOW", "REDACT"):
        return result["processed_prompt"]  # send this, never the original
    return None  # BLOCK or REVIEW: do not send`,
  },
  {
    lang: "TypeScript",
    code: `const res = await fetch("${API}/inspect", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt, target_provider: "auto" }),
});
const result = await res.json();

switch (result.action_decision) {
  case "ALLOW":
  case "REDACT":
    return send(result.processed_prompt);
  case "REVIEW":
    return notify(\`Waiting for approval: \${result.review_id}\`);
  case "BLOCK":
    throw new Error(result.reasons[0]);
}`,
  },
] as const;

const RESPONSE = `{
  "request_id": "req-3f2a9c1d7b44",
  "action_decision": "REDACT",
  "status": "COMPLETED",
  "routed_provider": "aws-bedrock",
  "processed_prompt": "Email [REDACTED:EMAIL] about her refund",
  "findings": [
    { "category": "email", "rule": "D5", "severity": "SENSITIVE",
      "start": 6, "end": 28, "confidence": 0.95, "source": "regex" }
  ],
  "route": { "status": "SELECTED", "selected": "aws-bedrock", "utility": 77.28,
             "ranking": ["aws-bedrock", "azure-ai", "local"], "notes": [] },
  "response": { "provider": "aws-bedrock", "text": "…", "decision": "ALLOW", "categories": [] },
  "vault": { "token_preview": "gAAAAABn…f3Q=", "kdf": "PBKDF2-HMAC-SHA256", "iterations": 600000 },
  "telemetry": [ { "step": 1, "node": "privacy_inspection", "event": "PERCEIVE", "detail": "…" } ],
  "graph_path": ["privacy_inspection", "vault_isolation", "provider_dispatch"],
  "timings_ms": { "total_ms": 3.4 },
  "policy_version": "1.0"
}`;

const CATEGORIES: ReadonlyArray<readonly [string, string, string]> = [
  ["Credentials", "BLOCK", "private_key_header, aws_access_key, aws_key_assignment, aws_secret_key, gcp_service_account_key, azure_sas_signature, azure_storage_key, github_token, llm_api_key, slack_token, google_api_key, stripe_secret_key, jwt_token, generic_api_token, password_assignment, db_connection_string"],
  ["Internal", "REVIEW", "internal_url"],
  ["Personal", "REDACT", "email, phone_in, phone_intl, ipv4, payment_card, aadhaar, pan, us_ssn, custom_redaction"],
];

export default function DocsPage() {
  return (
    <main className="mx-auto grid max-w-[1120px] gap-12 px-4 pb-10 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[200px_minmax(0,1fr)]">
      <DocsToc items={TOC} />
      <article className="min-w-0 max-w-[780px]">
        <p className="text-[15px] font-semibold text-accent-text">Documentation</p>
        <h1 className="mt-2 text-[40px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">Build with CipherMesh</h1>
        <p className="mt-4 text-[18px] leading-relaxed text-label-2">Everything you need to put a privacy checkpoint in front of any AI model: one endpoint, a predictable response, and the details behind every decision.</p>

        <div className="mt-14 flex flex-col gap-16">
          <section>
            <H2 id="overview">Overview</H2>
            <P>
              CipherMesh is a provider-neutral privacy control plane. Applications send prompts to CipherMesh instead of straight to a model. CipherMesh inspects
              the prompt, seals the evidence, decides, and either sends a safe version to the best-fit model or stops it. The response tells you exactly what was
              found, what was sent, where it went and why.
            </P>
            <Table
              head={["Base URL", "Format", "Version"]}
              rows={[[<C key="u">{API}</C>, "JSON over HTTPS", "v1 (policy 1.0)"]]}
            />
          </section>

          <section>
            <H2 id="quickstart">Quickstart</H2>
            <P>
              <strong className="text-label">1. Send a prompt.</strong> No key is needed on the public demo; your own deployment can require one (see Authentication).
            </P>
            <div className="mt-4">
              <CodeTabs samples={QUICK} label="Quickstart language" />
            </div>
            <P>
              <strong className="text-label">2. Read the decision.</strong> <C>action_decision</C> is one of <C>ALLOW</C>, <C>REDACT</C>, <C>REVIEW</C> or <C>BLOCK</C>.{" "}
              <C>processed_prompt</C> is what may be sent, and is <C>null</C> whenever nothing may leave.
            </P>
            <div className="mt-4">
              <Code label="200 OK · abridged">{RESPONSE}</Code>
            </div>
            <P>
              <strong className="text-label">3. Send only what CipherMesh returns.</strong> Never fall back to the original prompt. Treat <C>REVIEW</C> as “not yet”
              and <C>BLOCK</C> as “never”, and show the user <C>reasons[0]</C>.
            </P>
          </section>

          <section>
            <H2 id="modes">Integration Modes</H2>
            <Table
              head={["Mode", "How", "Use when"]}
              rows={[
                ["Gateway", <>CipherMesh calls the model and returns the inspected reply in <C>response</C>.</>, "You want one hop, provider routing and reply inspection."],
                ["Guard", <>Call <C>/inspect</C>, then send <C>processed_prompt</C> with your own SDK.</>, "You already own the model call and only need the checkpoint."],
                ["Agent node", "Run the core as a signed TCP node and exchange framed, HMAC-signed messages.", "Other agents need to submit work or push policy."],
              ]}
            />
            <P>On the public demo, cloud providers are simulated, so replies are placeholders. Decisions, redaction, routing, sealing and telemetry are real.</P>
          </section>

          <section>
            <H2 id="concepts">Concepts</H2>
            <H3 id="decisions">Decisions & statuses</H3>
            <Table
              head={["Decision", "Meaning", "What leaves"]}
              rows={[
                [<C key="a">ALLOW</C>, "Nothing policy-relevant found.", "The original prompt."],
                [<C key="r">REDACT</C>, "Personal data found and replaced with typed placeholders.", "The cleaned prompt."],
                [<C key="v">REVIEW</C>, "Internal context found; a person must decide.", "Nothing until approved, then the local model only."],
                [<C key="b">BLOCK</C>, "A credential or secret found.", "Nothing, ever."],
              ]}
            />
            <Table
              head={["Status", "Meaning"]}
              rows={[
                [<C key="1">COMPLETED</C>, "Sent and answered; the reply passed inspection."],
                [<C key="2">BLOCKED</C>, "Refused before any provider call."],
                [<C key="3">PENDING_REVIEW</C>, "Held in the approval queue."],
                [<C key="4">DENIED</C>, "A reviewer denied it."],
                [<C key="5">NO_ROUTE</C>, "No model satisfied the residency, budget and latency limits, so nothing was sent."],
                [<C key="6">PROVIDER_FAILED</C>, "Every eligible model failed; circuits may now be open."],
                [<C key="7">RESPONSE_BLOCKED</C>, "The model’s reply contained something that must not be shown."],
              ]}
            />

            <H3 id="categories">Detection categories</H3>
            <P>Each finding names its category. Aadhaar uses the Verhoeff check digit and payment cards the Luhn check. Spaced, base64-encoded and “name [at] domain” forms are rescanned.</P>
            <Table head={["Group", "Decision", "Categories"]} rows={CATEGORIES.map(([g, d, c]) => [g, <C key={g}>{d}</C>, <span key={c} className="font-mono text-[13px]">{c}</span>])} />

            <H3 id="routing-docs">Routing & residency</H3>
            <P>
              With <C>target_provider: &quot;auto&quot;</C>, CipherMesh removes any model that breaks a hard limit, then picks the highest utility:{" "}
              <C>U = 0.30·Q + 0.25·C + 0.20·L + 0.15·A + 0.10·P</C>. If the prompt contains Aadhaar, PAN or an Indian phone number, only Indian or local models
              remain. Naming a provider is a hint, not an override: policy limits still apply, and <C>route.notes</C> explains any change.
            </P>

            <H3 id="approvals-docs">Approvals</H3>
            <P>
              A <C>REVIEW</C> response includes <C>review_id</C>. Reviewers list pending tickets and decide them by name. Approved text is re-inspected and sent only to
              the private local model. Tickets expire after 15 minutes and live in memory on the instance that created them.
            </P>
          </section>

          <section>
            <H2 id="api">API Reference</H2>
            <Endpoint id="ep-inspect" method="POST" path="/api/v1/inspect" auth="Optional API token">
              Inspect a prompt and, when allowed, dispatch it. Body: <C>prompt</C> (1–65,536 characters) and <C>target_provider</C>:{" "}
              <C>auto | aws-bedrock | azure-ai | gcp-vertex | local</C>. Returns the full decision object shown in the Quickstart.
            </Endpoint>
            <Endpoint id="ep-reviews" method="GET" path="/api/v1/reviews?status=PENDING" auth="Reviewer token">
              List tickets: <C>review_id</C>, <C>created_at</C>, <C>expires_at</C>, <C>status</C>, <C>categories</C>, <C>reasons</C>, <C>safe_preview</C>,{" "}
              <C>requested_provider</C>.
            </Endpoint>
            <Endpoint method="POST" path="/api/v1/reviews/{review_id}/decision" auth="Reviewer token">
              Body <C>{`{ "approved": true, "reviewer": "security-lead" }`}</C>. Returns the decision object with <C>status</C> <C>COMPLETED</C>, <C>DENIED</C> or{" "}
              <C>BLOCKED</C>. <C>404</C> unknown or expired, <C>409</C> already decided.
            </Endpoint>
            <div id="ep-system" className="scroll-mt-28" />
            <Endpoint method="GET" path="/api/v1/health" auth="Public">
              <C>status</C>, <C>version</C>, <C>graph</C>, <C>vault</C> (<C>ready</C> or <C>ephemeral</C>), <C>mode</C> and <C>uptime_s</C>.
            </Endpoint>
            <Endpoint method="GET" path="/api/v1/providers" auth="Public">
              The provider registry: region, residency, list and negotiated price, p95 latency, quality, availability and circuit state.
            </Endpoint>
            <Endpoint method="GET" path="/api/v1/metrics" auth="Public">
              Counters since start: <C>requests_total</C>, <C>decisions</C>, <C>status_counts</C>, <C>pending_reviews</C>, <C>mean_latency_ms</C>, <C>p95_latency_ms</C>.
            </Endpoint>
            <Endpoint method="GET" path="/api/v1/graph" auth="Public">
              The compiled agent graph: Mermaid source, nodes and edges.
            </Endpoint>
            <Endpoint method="GET" path="/api/v1/threats/live" auth="Public">
              Security-related AI incident headlines from the AI Incident Database, cached for 30 minutes. Returns <C>available: false</C> when the source can’t be
              reached and no copy is cached.
            </Endpoint>
          </section>

          <section>
            <H2 id="auth">Authentication</H2>
            <Table
              head={["Header", "Required when", "Protects"]}
              rows={[
                [<C key="a">X-CipherMesh-Token</C>, <>The server sets <C>CIPHERMESH_API_TOKEN</C>.</>, "POST /inspect"],
                [<C key="b">X-CipherMesh-Reviewer-Token</C>, <>The server sets <C>CIPHERMESH_REVIEW_TOKEN</C>. Production without it disables approvals.</>, "Review endpoints"],
                [<C key="c">X-Request-ID</C>, "Optional. Reused when it matches [A-Za-z0-9-]{1,64}.", "Tracing"],
              ]}
            />
            <P>Tokens are compared in constant time. CORS never allows credentials, so browsers cannot send cookies to the API.</P>
          </section>

          <section>
            <H2 id="errors">Errors & Limits</H2>
            <Table
              head={["Code", "When", "What to do"]}
              rows={[
                ["401", "Missing or wrong token.", "Send the right header."],
                ["403", "Approvals are disabled on this server.", "Ask an administrator to set a reviewer token."],
                ["404", "Unknown or expired review.", "Refresh the queue."],
                ["409", "Review already decided.", "No action needed."],
                ["413", "Body over the limit (400 KB by default, counted while streaming).", "Send less text."],
                ["422", "Invalid body. Errors name fields and never echo your prompt.", "Fix the field."],
                ["429", "Rate limit (120 a minute per client by default).", "Wait for Retry-After seconds."],
                ["500", "Unexpected error. The body carries request_id.", "Retry; quote the request ID."],
              ]}
            />
          </section>

          <section>
            <H2 id="config">Configuration</H2>
            <P>Self-host anywhere Python 3.12 runs. Set these environment variables on the API.</P>
            <Table
              head={["Variable", "Default", "Purpose"]}
              rows={[
                [<C key="1">CIPHERMESH_ENV</C>, "development", "production enforces a vault seed and salt."],
                [<C key="2">CIPHERMESH_VAULT_SEED</C>, "—", "32+ random characters. Required in production."],
                [<C key="3">CIPHERMESH_VAULT_SALT</C>, "—", "Required in production."],
                [<C key="4">CIPHERMESH_VAULT_PREVIOUS_SEEDS</C>, "—", "Comma-separated retired seeds, kept readable during rotation."],
                [<C key="5">CIPHERMESH_VAULT_ITERATIONS</C>, "600000", "PBKDF2 iterations."],
                [<C key="6">CIPHERMESH_API_TOKEN</C>, "—", "Require a token on /inspect."],
                [<C key="7">CIPHERMESH_REVIEW_TOKEN</C>, "—", "Reviewer credential for approvals."],
                [<C key="8">CIPHERMESH_CORS_ORIGINS</C>, "*", "Comma-separated allowed origins."],
                [<C key="9">CIPHERMESH_RATE_LIMIT_PER_MIN</C>, "120", "Per-client requests a minute; 0 disables."],
                [<C key="10">CIPHERMESH_MAX_BODY_BYTES</C>, "400000", "Request body cap."],
                [<C key="11">CIPHERMESH_REVIEW_TTL_S</C>, "900", "Ticket lifetime in seconds."],
                [<C key="12">CIPHERMESH_AUDIT_PATH</C>, ":memory:", "SQLite path for the metadata-only audit log."],
              ]}
            />
            <P>
              The console reads <C>NEXT_PUBLIC_API_BASE_URL</C>. Generate a seed with <C>python -c &quot;import secrets; print(secrets.token_urlsafe(48))&quot;</C>.
            </P>
          </section>

          <section>
            <H2 id="security">Security Model</H2>
            <ul className="mt-4 flex flex-col gap-3 text-[16px] leading-[1.7] text-label-2">
              {[
                ["Fail closed.", "A full review queue, a malformed request or no feasible model all mean nothing is sent."],
                ["No raw prompts at rest.", "Prompts are fingerprinted with HMAC for logs; the text is dropped from state as soon as it isn’t needed and never written to the vault, the audit log or error responses."],
                ["Blocked means silent.", "A blocked prompt’s preview is always null, so no part of a secret is echoed back."],
                ["Encrypted evidence.", "PBKDF2-HMAC-SHA256 (600,000 iterations) into Fernet, with MultiFernet rotation."],
                ["Both directions.", "Model replies are inspected before they reach the user."],
                ["Hardened edge.", "Streaming body cap, per-client rate limit, constant-time token checks, no-credential CORS and strict security headers."],
              ].map(([t, d]) => (
                <li key={t}>
                  <strong className="text-label">{t}</strong> {d}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <H2 id="changelog">Changelog</H2>
            <ol className="mt-4 flex flex-col gap-5">
              {[
                ["2.3", "October 2026", "Product site, AI threat intelligence dashboard with a live feed, architecture deep-dive with live engineering foundations, documentation, role-based examples, collapsible result cards, provider picker, and a race fix in /graph."],
                ["2.2", "October 2026", "Apple-style console: sidebar and tab bar, Activity, redaction sweep, approvals confirmation, accessibility audit fixes."],
                ["2.0", "October 2026", "FastAPI and LangGraph control plane, Fernet vault, utility routing, approvals and the web console."],
              ].map(([v, d, t]) => (
                <li key={v} className="surface rounded-2xl p-5">
                  <p className="flex items-baseline gap-3">
                    <span className="font-mono text-[15px] font-bold text-label">v{v}</span>
                    <span className="text-[13px] text-label-2">{d}</span>
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed text-label-2">{t}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </article>
    </main>
  );
}
