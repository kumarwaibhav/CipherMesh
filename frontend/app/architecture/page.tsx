import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowUpRight, Ban, CheckCircle2, Clock, EyeOff, Inbox, LockKeyhole, Route, ScanSearch, Send, ShieldCheck } from "lucide-react";
import { ArchitectureExplorer } from "../components/ArchitectureExplorer";
import { Collapsible } from "../components/Collapsible";
import { FoundationsLive } from "../components/FoundationsLive";
import { MermaidSource } from "../components/MermaidSource";
import { ProvidersLive } from "../components/ProvidersLive";
import { PageHero, SiteSection, TextLink } from "../components/site";
import { focusRing } from "../components/ui";

export const metadata: Metadata = {
  title: "How It Works",
  description: "The CipherMesh architecture in depth: the API gateway, the four-stage agent core, detection and policy, routing, approvals, the vault and the engineering foundations underneath.",
};

function Stage({ n, node, title, Icon, does, reads, writes, drops }: { n: number; node: string; title: string; Icon: typeof ScanSearch; does: string; reads: string; writes: string; drops?: string }) {
  return (
    <li className="surface relative flex flex-col rounded-3xl p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--accent)/0.12)] text-accent-text">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-mono text-[12px] text-label-2">
            {n} · {node}
          </p>
          <h3 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h3>
        </div>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-label">{does}</p>
      <dl className="sep mt-4 grid gap-1.5 border-t pt-3 text-[13px]">
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 font-semibold text-label-2">Reads</dt>
          <dd className="font-mono text-[12px] leading-5 text-label">{reads}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 font-semibold text-label-2">Writes</dt>
          <dd className="font-mono text-[12px] leading-5 text-label">{writes}</dd>
        </div>
        {drops ? (
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 font-semibold text-label-2">Drops</dt>
            <dd className="font-mono text-[12px] leading-5 text-block-text">{drops}</dd>
          </div>
        ) : null}
      </dl>
    </li>
  );
}

function Exit({ tone, Icon, node, title, children }: { tone: string; Icon: typeof Ban; node: string; title: string; children: ReactNode }) {
  return (
    <li className="surface flex flex-col rounded-3xl p-5">
      <p className={`flex items-center gap-2 text-[15px] font-semibold ${tone}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {title}
      </p>
      <p className="mt-0.5 font-mono text-[12px] text-label-2">{node}</p>
      <div className="mt-3 text-[14px] leading-relaxed text-label-2">{children}</div>
    </li>
  );
}

function Timeline({ steps }: { steps: ReadonlyArray<readonly [string, string, string]> }) {
  return (
    <ol className="surface relative rounded-3xl p-5 sm:p-7">
      {steps.map(([who, title, text], i) => (
        <li key={title} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 ? <span aria-hidden="true" className="absolute left-[15px] top-9 h-[calc(100%-28px)] w-0.5 rounded bg-[var(--separator)]" /> : null}
          <span className="fill relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums text-label">{i + 1}</span>
          <div className="min-w-0 pt-0.5">
            <p className="font-mono text-[12px] text-label-2">{who}</p>
            <h3 className="text-[16px] font-semibold">{title}</h3>
            <p className="mt-0.5 text-[15px] leading-relaxed text-label-2">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const DETECTORS = [
  {
    severity: "Critical",
    decision: "Blocked",
    Icon: Ban,
    tone: "text-block-text",
    rule: "R1",
    items: "Private keys, AWS keys and secrets, GCP service-account keys, Azure SAS and storage keys, GitHub, Slack, Stripe, Google and LLM API keys, JWTs, database connection strings, password and token assignments",
  },
  {
    severity: "Confidential",
    decision: "Waiting",
    Icon: Clock,
    tone: "text-review-text",
    rule: "R3",
    items: "Internal and corporate URLs (*.internal, *.corp, *.intranet, *.local, *.lan)",
  },
  {
    severity: "Sensitive",
    decision: "Cleaned",
    Icon: EyeOff,
    tone: "text-redact-text",
    rule: "R2",
    items: "Email addresses, Indian and international phone numbers, IPv4 addresses, payment cards (Luhn-checked), Aadhaar (Verhoeff-checked), PAN, US SSN, plus custom patterns pushed by policy",
  },
  {
    severity: "None",
    decision: "Safe",
    Icon: CheckCircle2,
    tone: "text-allow-text",
    rule: "R4",
    items: "Nothing policy-relevant found; the prompt is sent as written",
  },
] as const;

const CHECK_STEPS = [
  ["Client", "Send the prompt", "POST /api/v1/inspect with the prompt and an optional target model."],
  ["Gateway", "Pass the guard strip", "Body size counted, rate limit checked, optional token verified, request ID assigned."],
  ["Inspect", "Find and classify", "The prompt is fingerprinted with HMAC for logs, scanned by 25 detectors and de-obfuscated views, then policy picks the strictest outcome."],
  ["Seal", "Encrypt the evidence", "Decision, findings and fingerprint are sealed with Fernet and verified by decrypting once; an audit event records metadata only."],
  ["Route", "Choose the exit", "BLOCK ends here, REVIEW goes to the queue, ALLOW and REDACT continue to dispatch."],
  ["Dispatch", "Procure and route", "Negotiated prices are applied, residency rules narrow the field, and the highest-utility model is chosen."],
  ["Provider", "Call the model", "Only safe or cleaned text is sent. Failures fall back to the next model; repeated failures open its circuit."],
  ["Reply", "Inspect the answer", "The model’s reply is scanned too and cleaned before it reaches the user."],
  ["Client", "Get the full picture", "Decision, cleaned text, chosen model, reply, sealed-token preview and a step-by-step trace."],
] as const;

const APPROVAL_STEPS = [
  ["Agent core", "Hold, don’t send", "A prompt with internal context gets a ticket. The raw text stays in memory only, and nothing leaves."],
  ["Reviewer", "Unlock the queue", "Reviewers present a reviewer token; without one in production, the queue is switched off rather than left open."],
  ["Reviewer", "Read the safe preview", "The ticket shows categories, reasons, the requested model and a redacted preview, never the raw secrets."],
  ["Reviewer", "Approve or deny, by name", "Every decision is recorded against the reviewer’s name. Deny discards the prompt."],
  ["Agent core", "Re-inspect on approval", "Approved text is checked again; if it now contains a secret, it is blocked anyway."],
  ["Provider", "Local model only", "Approved internal content goes only to the private local model, never to a cloud provider."],
] as const;

export default function HowItWorksPage() {
  return (
    <main>
      <PageHero
        kicker="How It Works"
        title="A privacy checkpoint, built as an agent."
        lead="CipherMesh sits between your applications and every AI model. A hardened API gateway admits each request, a four-stage agent core decides what may leave, and only safe or cleaned text ever reaches a provider."
      />

      <SiteSection id="layers" kicker="Architecture" title="Four layers, one direction of flow." lead="Select a layer to see what it does. The gateway and agent core run inside your trust boundary; providers sit outside it.">
        <ArchitectureExplorer />
      </SiteSection>

      <SiteSection
        id="agent-core"
        kicker="Agent Core"
        title="Inspect, Seal, Route, Act."
        lead="The core is a LangGraph state machine over one typed state object. Each stage reads what it needs, writes its result, and drops the raw prompt the moment nothing downstream needs it. Logs and the path taken are append-only."
      >
        <ol className="relative grid gap-3 lg:grid-cols-3">
          <span aria-hidden="true" className="flow-line absolute left-[16%] right-[16%] top-[42px] hidden h-0.5 lg:block" />
          <Stage
            n={1}
            node="privacy_inspection"
            title="Inspect"
            Icon={ScanSearch}
            does="Perceives the prompt, runs every detector and de-obfuscated rescans, then applies policy R1–R5. The strictest finding sets the decision."
            reads="raw_prompt, target_provider"
            writes="findings, action_decision, reasons, processed_prompt, safe_preview"
          />
          <Stage
            n={2}
            node="vault_isolation"
            title="Seal"
            Icon={LockKeyhole}
            does="Seals the decision, findings and prompt fingerprint into an encrypted envelope, proves it decrypts, and writes a metadata-only audit event."
            reads="action_decision, findings, reasons"
            writes="vault_token, audit event"
            drops="raw_prompt when BLOCK"
          />
          <Stage
            n={3}
            node="execution_router"
            title="Route"
            Icon={Route}
            does="A conditional edge, not a node: it maps the decision to exactly one exit. REVIEW can never take the sending path, so held content fails closed."
            reads="action_decision"
            writes="next node: block_end · review_end · execute_end"
          />
        </ol>
        <div aria-hidden="true" className="mx-auto hidden h-10 w-0.5 flow-line-v lg:block" />
        <p className="mb-3 mt-6 text-center text-[15px] font-semibold text-label lg:mt-0">4 · Act: exactly one exit per request</p>
        <ul className="grid gap-3 lg:grid-cols-3">
          <Exit tone="text-block-text" Icon={Ban} node="block_terminal" title="Refuse">
            Status <span className="font-mono">BLOCKED</span>. Raw and processed text are cleared, nothing is transmitted, and the response says which credential to rotate.
          </Exit>
          <Exit tone="text-review-text" Icon={Inbox} node="review_hold" title="Hold for a Person">
            A ticket is queued in memory for 15 minutes (up to 1,000). If the queue is full the request is blocked, so it fails closed. Raw text is cleared from state.
          </Exit>
          <Exit tone="text-allow-text" Icon={Send} node="provider_dispatch" title="Send Safely">
            Negotiated prices, residency constraints and utility pick the model; fallback and circuit breakers handle failure; the reply is inspected before it returns.
          </Exit>
        </ul>
        <div className="mt-3">
          <Collapsible title="The State Contract" meta="Fields every stage shares" defaultOpen={false}>
            <div className="scrollbar-thin overflow-x-auto px-5 pb-5" tabIndex={0} role="region" aria-label="State fields, scrolls sideways on small screens">
              <table className="w-full min-w-[620px] text-left text-[14px]">
                <thead>
                  <tr className="text-[12px] text-label-2">
                    {["Field", "Set by", "Purpose"].map((h) => (
                      <th key={h} scope="col" className="sep border-b px-2 pb-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="align-top">
                  {[
                    ["raw_prompt", "Gateway", "The original text. Cleared by Seal on BLOCK, and by every exit."],
                    ["action_decision", "Inspect", "ALLOW, REDACT, REVIEW or BLOCK."],
                    ["findings", "Inspect", "Category, rule, severity, span, confidence and source for each match."],
                    ["processed_prompt", "Inspect", "What may be sent: the original for ALLOW, cleaned text for REDACT, nothing otherwise."],
                    ["vault_token", "Seal", "Encrypted, authenticated evidence envelope."],
                    ["route", "Act", "Feasible models, utilities, ranking, exclusions and residency notes."],
                    ["logs · graph_path", "Every stage", "Append-only reducers: the trace you see in Technical Details."],
                  ].map(([f, by, p]) => (
                    <tr key={f} className="sep border-b last:border-0">
                      <th scope="row" className="px-2 py-2.5 font-mono text-[13px] font-semibold text-label">
                        {f}
                      </th>
                      <td className="px-2 py-2.5 text-label-2">{by}</td>
                      <td className="px-2 py-2.5 text-label">{p}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Collapsible>
        </div>
      </SiteSection>

      <SiteSection id="detection" kicker="Detection & Policy" title="25 detectors, five rules, highest risk wins." lead="Detectors are grouped by severity, and severity maps to a decision. Numbers with check digits are validated, so a random 12-digit string isn’t mistaken for an Aadhaar number. Spaced-out, base64-encoded and “name [at] domain” values are rescanned in normalised form.">
        <ul className="grid gap-3 md:grid-cols-2">
          {DETECTORS.map((d) => (
            <li key={d.severity} className="surface rounded-3xl p-6">
              <div className="flex items-center justify-between gap-2">
                <p className={`flex items-center gap-2 text-[17px] font-semibold ${d.tone}`}>
                  <d.Icon className="h-5 w-5" aria-hidden="true" />
                  {d.decision}
                </p>
                <span className="font-mono text-[12px] text-label-2">
                  {d.rule} · {d.severity}
                </span>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-label-2">{d.items}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-label-2">R5 blocks any payload over the configured byte limit before detection runs.</p>
      </SiteSection>

      <SiteSection id="routing" kicker="Routing" title="Constraints first, then the best model." lead="Routing is a two-step decision. Hard limits remove any model that would break policy; the remaining models are scored and the highest utility wins. An exhaustive search must agree with the fast pick.">
        <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
          <div className="surface rounded-3xl p-6">
            <h3 className="text-[17px] font-semibold">Hard limits</h3>
            <ul className="mt-3 flex flex-col gap-2 text-[15px] leading-relaxed text-label-2">
              <li>Residency: Aadhaar, PAN or an Indian phone number restricts routing to in-country or local models.</li>
              <li>Budget and latency ceilings per request.</li>
              <li>Circuit state: a model with an open circuit is skipped.</li>
              <li>No feasible model means nothing is sent.</li>
            </ul>
            <h3 className="mt-6 text-[17px] font-semibold">Utility</h3>
            <p className="mt-2 rounded-xl bg-[var(--fill-2)] px-4 py-3 font-mono text-[13px] leading-6 text-label">
              U = 0.30·Quality + 0.25·Cost + 0.20·Latency
              <br />
              {"    "}+ 0.15·Availability + 0.10·Privacy
            </p>
            <p className="mt-3 text-[13px] text-label-2">Each term is scaled 0–100. Privacy scores 100 for local, 80 for in-country cloud, 50 otherwise. Cost uses the negotiated contract price when there is one.</p>
          </div>
          <div className="surface rounded-3xl p-6">
            <h3 className="text-[17px] font-semibold">Live provider registry</h3>
            <p className="mb-4 mt-1 text-[13px] text-label-2">Read from the running gateway.</p>
            <ProvidersLive />
          </div>
        </div>
      </SiteSection>

      <SiteSection id="check-flow" kicker="Lifecycle" title="What happens when you press Check." lead="Nine steps, usually in well under a second; the agent’s own work typically takes a few milliseconds.">
        <Timeline steps={CHECK_STEPS} />
      </SiteSection>

      <SiteSection id="approvals" kicker="Approvals" title="How a held prompt is decided." lead="Internal context isn’t forbidden, it’s someone’s call. The approval flow makes that call explicit, named and safe.">
        <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
          <Timeline steps={APPROVAL_STEPS} />
          <div className="surface rounded-3xl p-6">
            <h3 className="text-[17px] font-semibold">Ticket states</h3>
            <ol className="mt-4 flex flex-col gap-3 text-[14px]">
              {[
                ["Pending", "Waiting for a reviewer, for up to 15 minutes.", "text-review-text"],
                ["Approved", "Re-inspected, then sent to the private local model.", "text-allow-text"],
                ["Denied", "Discarded. Nothing was ever sent.", "text-block-text"],
                ["Expired", "Not decided in time: treated as denied.", "text-label-2"],
              ].map(([s, d, tone]) => (
                <li key={s} className="flex items-start gap-3">
                  <span className={`w-20 shrink-0 font-semibold ${tone}`}>{s}</span>
                  <span className="text-label-2">{d}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-[13px] leading-relaxed text-label-2">Tickets live in the memory of the instance that created them. On serverless hosting, a recycled instance drops its pending tickets, which is the safe failure.</p>
          </div>
        </div>
      </SiteSection>

      <SiteSection id="vault" kicker="Vault & Audit" title="Evidence you can trust, without the data you shouldn’t keep.">
        <ul className="grid gap-3 md:grid-cols-3">
          {[
            ["Key derivation", "PBKDF2-HMAC-SHA256 at 600,000 iterations from a deployment seed and salt. Production refuses to start without them."],
            ["Encryption", "Fernet: AES-128-CBC with HMAC-SHA256 authentication. MultiFernet keeps retired keys readable during rotation."],
            ["Audit log", "Decisions, categories and key IDs only. The prompt itself is never written to logs, the vault or responses."],
          ].map(([t, d]) => (
            <li key={t} className="surface rounded-3xl p-6">
              <ShieldCheck className="h-5 w-5 text-accent-text" aria-hidden="true" />
              <h3 className="mt-3 text-[17px] font-semibold">{t}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-label-2">{d}</p>
            </li>
          ))}
        </ul>
      </SiteSection>

      <SiteSection
        id="foundations"
        kicker="Engineering Foundations"
        title="Six agent-engineering modules, watched live."
        lead="Each foundation of agent design is a tested module in CipherMesh. Run a real check and watch which modules act on it, in order, straight from the gateway’s telemetry."
      >
        <FoundationsLive />
      </SiteSection>

      <SiteSection id="diagrams" kicker="Reference" title="Diagrams and the live graph.">
        <div className="flex flex-col gap-3">
          {[
            ["/diagrams/architecture.svg", "System Architecture", "Clients, gateway, agent core and providers, with every module."],
            ["/diagrams/langgraph_flow.svg", "Agent State Machine", "The compiled LangGraph: one entry, three exits."],
            ["/diagrams/request_sequence.svg", "Request Sequence", "One check from the browser to the model and back."],
          ].map(([src, title, caption]) => (
            <Collapsible key={src} title={title} meta={caption} defaultOpen={false}>
              <div className="px-3 pb-3">
                <div role="region" aria-label={`${title}, scrolls sideways on small screens`} tabIndex={0} className={`scrollbar-thin overflow-x-auto rounded-xl bg-white p-2 sm:overflow-visible ${focusRing}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${title}: ${caption}`} width={1600} height={900} loading="lazy" className="min-w-[860px] sm:min-w-0" style={{ width: "100%", height: "auto" }} />
                </div>
                <a href={src} target="_blank" rel="noopener noreferrer" className={`mt-2 inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 text-[14px] font-semibold text-accent-text ${focusRing}`}>
                  Open Full Size
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </Collapsible>
          ))}
          <Collapsible title="Live Agent Graph" meta="Mermaid source from the running server" defaultOpen={false}>
            <div className="px-5 pb-5">
              <MermaidSource />
            </div>
          </Collapsible>
        </div>
        <p className="mt-8">
          <TextLink href="/docs">Read the documentation</TextLink>
        </p>
      </SiteSection>
    </main>
  );
}
