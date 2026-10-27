import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Ban,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  Cpu,
  EyeOff,
  Fingerprint,
  Gauge,
  HeartPulse,
  Inbox,
  Landmark,
  LockKeyhole,
  Network,
  Route,
  ScanSearch,
  Scale,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import { HeroDemo } from "./components/HeroDemo";
import { Code, SiteSection, Source, TextLink } from "./components/site";
import { focusRing } from "./components/ui";
import { HEADLINE_STATS, INCIDENTS, VECTORS } from "@/lib/threats";

export const metadata: Metadata = {
  title: { absolute: "CipherMesh — the privacy control plane for enterprise AI" },
  description:
    "CipherMesh checks every prompt before it reaches an AI model: secrets are stopped, personal data is hidden, internal context waits for approval, and every decision is sealed for audit.",
};

const STEPS = [
  { Icon: ScanSearch, title: "Inspect", text: "25 detectors find credentials, keys, personal and internal data. Aadhaar and card numbers are checksum-verified, not guessed." },
  { Icon: LockKeyhole, title: "Seal", text: "The decision and its evidence are encrypted into a tamper-evident envelope. The raw prompt is never logged or stored." },
  { Icon: Route, title: "Route", text: "Policy decides the exit; a utility optimiser picks the model that meets residency, cost, latency and quality limits." },
  { Icon: ShieldCheck, title: "Act", text: "Send as written, send cleaned, hold for a person, or refuse. Replies are inspected on the way back." },
] as const;

const OUTCOMES = [
  { Icon: CheckCircle2, cls: "text-allow-text", word: "Safe", text: "Nothing private found. The prompt goes out exactly as written, to the best-fit model." },
  { Icon: EyeOff, cls: "text-redact-text", word: "Cleaned", text: "Emails, phone numbers, card and ID numbers are replaced before sending. The AI never sees them." },
  { Icon: Clock, cls: "text-review-text", word: "Waiting", text: "Internal links and hosts wait for a reviewer. Approved text only goes to a private model." },
  { Icon: Ban, cls: "text-block-text", word: "Blocked", text: "Passwords, keys and tokens never leave. The sender is told which credential to rotate." },
] as const;

const CAPABILITIES = [
  { Icon: Fingerprint, title: "Detection Engine", text: "25 rules across secrets, personal and internal data, with checksum validation and de-obfuscation for spaced or encoded values.", span: "lg:col-span-2" },
  { Icon: LockKeyhole, title: "Evidence Vault", text: "PBKDF2-HMAC-SHA256 at 600,000 iterations into Fernet, with key rotation. Audit stores metadata, never the prompt.", span: "" },
  { Icon: Network, title: "Policy-Aware Routing", text: "Residency, budget and latency are hard limits; utility is maximised inside them. Indian personal data stays in India.", span: "" },
  { Icon: Inbox, title: "Human Approvals", text: "Held prompts wait in memory with a time limit, decided by a named reviewer, released only to a private model.", span: "" },
  { Icon: Workflow, title: "API-First Agent", text: "One POST call in front of any model. A LangGraph state machine with a full telemetry trace for every decision.", span: "lg:col-span-1" },
] as const;

const INDUSTRIES = [
  { Icon: Landmark, name: "Banking & Fintech", text: "Card, PAN and Aadhaar data stays out of third-party models; every decision is audit-ready." },
  { Icon: HeartPulse, name: "Healthcare", text: "Patient identifiers are removed before clinicians use AI for notes and summaries." },
  { Icon: Building2, name: "Government", text: "Residency-constrained routing keeps citizen data in-country or on-premises." },
  { Icon: Cpu, name: "SaaS & Engineering", text: "Keys, tokens and connection strings never reach a coding assistant." },
  { Icon: Users, name: "Support & BPO", text: "Agents use AI on live tickets without exposing customer contact details." },
  { Icon: Scale, name: "Legal & Professional", text: "Client-confidential matter stays under a reviewer’s control." },
] as const;

const ROLES = [
  { role: "CISO & Security", gets: "One enforcement point for every model, with sealed evidence instead of screenshots." },
  { role: "Platform Engineering", gets: "A drop-in gateway with a stable API, provider fallback and circuit breakers." },
  { role: "Privacy & Compliance", gets: "Residency rules, approval trails and metadata-only audit logs." },
  { role: "Every Employee", gets: "Keep using AI. CipherMesh shows exactly what left and why." },
] as const;

const FOUNDATIONS = [
  { tag: "PEAS", name: "Agent Specification", text: "Measured performance: critical recall, false-block rate, latency." },
  { tag: "Reflex", name: "Rule Engine", text: "Condition–action rules, highest risk wins." },
  { tag: "Concurrency", name: "Runtime & Monitor", text: "Worker pool, back-pressure, health probes." },
  { tag: "Messaging", name: "Signed Transport", text: "Framed, HMAC-signed agent messages." },
  { tag: "Multi-agent", name: "Contract-Net Procurement", text: "Negotiated provider prices, two-phase commit." },
  { tag: "Utility", name: "Constrained Optimiser", text: "Feasibility first, then argmax utility." },
] as const;

const CURL = `curl -X POST https://ciphermesh-api.vercel.app/api/v1/inspect \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Email ananya.rao@example.com about her refund", "target_provider": "auto"}'

# → "action_decision": "REDACT"
# → "processed_prompt": "Email [REDACTED:EMAIL] about her refund"
# → "routed_provider": "aws-bedrock"`;

function vectorCounts() {
  const counts = VECTORS.map((v) => ({ ...v, n: INCIDENTS.filter((i) => i.vector === v.id).length }));
  return counts.sort((a, b) => b.n - a.n);
}

export default function LandingPage() {
  const counts = vectorCounts();
  const max = Math.max(...counts.map((c) => c.n));
  const latest = [...INCIDENTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <main>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="mx-auto grid max-w-[1120px] items-center gap-12 px-4 pb-10 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[var(--fill-2)] px-3 py-1 text-[13px] font-medium text-label-2">
            <span className="h-1.5 w-1.5 rounded-full bg-allow" aria-hidden="true" />
            The privacy control plane for enterprise AI
          </p>
          <h1 id="hero-title" className="mt-5 text-balance text-[44px] font-bold leading-[1.02] tracking-[-0.035em] text-label sm:text-[64px]">
            Every prompt, checked before it leaves.
          </h1>
          <p className="mt-5 max-w-[540px] text-pretty text-[18px] leading-relaxed text-label-2 sm:text-[20px]">
            Your people paste emails, logs, code and customer records into AI tools every day. CipherMesh stops the secrets, hides the personal data and
            holds internal context for approval, before any model sees it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/check" className={`inline-flex min-h-[48px] items-center gap-2 rounded-full bg-accent px-6 text-[16px] font-semibold text-white transition-colors hover:bg-accent-hover ${focusRing}`}>
              Try It Now
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/architecture" className={`fill inline-flex min-h-[48px] items-center gap-2 rounded-full px-6 text-[16px] font-semibold text-label transition-colors hover:bg-[var(--fill)] ${focusRing}`}>
              See How It Works
            </Link>
          </div>
          <p className="mt-8 text-[13px] text-label-2">
            Provider-neutral: AWS Bedrock · Azure AI Foundry · Google Vertex AI · private local models
          </p>
        </div>
        <HeroDemo />
      </section>

      {/* Problem */}
      <SiteSection
        id="problem"
        kicker="The Problem"
        title="Your people already use AI. Your data goes with it."
        lead="Most AI data loss isn’t a sophisticated attack. It’s a support agent pasting a ticket, an engineer pasting a .env file, or an AI vendor leaving a database open. The prompt is where it starts."
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HEADLINE_STATS.map((s) => (
            <li key={s.label} className="surface flex flex-col rounded-3xl p-6">
              <p className="text-[44px] font-bold leading-none tracking-[-0.03em] text-label tabular-nums">{s.value}</p>
              <p className="mt-3 flex-1 text-[15px] leading-snug text-label">{s.label}</p>
              <p className="mt-4">
                <Source name={s.source.name} url={s.source.url} />
              </p>
            </li>
          ))}
        </ul>
      </SiteSection>

      {/* How it works */}
      <SiteSection
        id="platform"
        kicker="How It Works"
        title="Four stages. Milliseconds. Before any provider call."
        lead="CipherMesh sits between your applications and every AI model. Each prompt passes through the same agent pipeline and leaves through exactly one exit."
      >
        <ol className="relative grid gap-3 md:grid-cols-4">
          <span aria-hidden="true" className="absolute left-[12%] right-[12%] top-[44px] hidden h-px bg-gradient-to-r from-transparent via-[rgb(var(--accent)/0.5)] to-transparent md:block" />
          {STEPS.map(({ Icon, title, text }, i) => (
            <li key={title} className="surface relative flex flex-col rounded-3xl p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--accent)/0.12)] text-accent-text">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-5 text-[13px] font-semibold text-label-2">Stage {i + 1}</p>
              <h3 className="mt-0.5 text-[20px] font-semibold tracking-[-0.01em]">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-label-2">{text}</p>
            </li>
          ))}
        </ol>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {OUTCOMES.map(({ Icon, cls, word, text }) => (
            <li key={word} className="surface rounded-3xl p-6">
              <p className={`flex items-center gap-2 text-[17px] font-semibold ${cls}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
                {word}
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-label-2">{text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          <TextLink href="/architecture">Explore the architecture</TextLink>
        </p>
      </SiteSection>

      {/* Capabilities */}
      <SiteSection id="capabilities" kicker="Platform" title="One control point for every model you use.">
        <ul className="grid gap-3 lg:grid-cols-3">
          {CAPABILITIES.map(({ Icon, title, text, span }) => (
            <li key={title} className={`surface rounded-3xl p-7 ${span}`}>
              <Icon className="h-6 w-6 text-accent-text" aria-hidden="true" />
              <h3 className="mt-4 text-[20px] font-semibold tracking-[-0.01em]">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-label-2">{text}</p>
            </li>
          ))}
          <li className="surface flex flex-col justify-between rounded-3xl p-7">
            <div>
              <Gauge className="h-6 w-6 text-accent-text" aria-hidden="true" />
              <h3 className="mt-4 text-[20px] font-semibold tracking-[-0.01em]">Reply Inspection</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-label-2">Model output is checked on the way back, so a reply can’t hand back what the prompt kept out.</p>
            </div>
          </li>
        </ul>
      </SiteSection>

      {/* Who it's for */}
      <SiteSection
        id="who"
        kicker="Who It’s For"
        title="Built for teams that can’t afford a leak."
        lead="Any organisation using AI on real work: regulated industries first, and every team that touches customer data or production systems."
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map(({ Icon, name, text }) => (
            <li key={name} className="surface flex gap-4 rounded-3xl p-6">
              <Icon className="mt-0.5 h-6 w-6 shrink-0 text-label-2" aria-hidden="true" />
              <div>
                <h3 className="text-[17px] font-semibold">{name}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-label-2">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="surface mt-3 grid divide-y divide-[var(--separator)] rounded-3xl sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
          {ROLES.map(({ role, gets }) => (
            <div key={role} className="p-6">
              <dt className="text-[15px] font-semibold text-label">{role}</dt>
              <dd className="mt-1 text-[15px] leading-relaxed text-label-2">{gets}</dd>
            </div>
          ))}
        </dl>
      </SiteSection>

      {/* Threat intel teaser */}
      <SiteSection
        id="threats"
        kicker="Threat Intelligence"
        title="AI incidents are no longer hypothetical."
        lead={`We track documented AI security incidents from 2023 to today, each one dated and sourced. ${INCIDENTS.length} so far, from pasted source code to agents breaching production.`}
      >
        <div className="grid gap-3 lg:grid-cols-[1fr_1.1fr]">
          <figure className="surface rounded-3xl p-6">
            <figcaption className="text-[15px] font-semibold">Incidents by attack vector</figcaption>
            <ul className="mt-5 flex flex-col gap-3">
              {counts.map((c) => (
                <li key={c.id} className="grid grid-cols-[minmax(0,150px)_1fr_auto] items-center gap-3 text-[13px]">
                  <span className="truncate text-label-2">{c.label}</span>
                  <span className="fill h-2 overflow-hidden rounded-full" aria-hidden="true">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(c.n / max) * 100}%` }} />
                  </span>
                  <span className="w-5 text-right font-semibold tabular-nums text-label">{c.n}</span>
                </li>
              ))}
            </ul>
          </figure>
          <ul className="surface divide-y divide-[var(--separator)] rounded-3xl">
            {latest.map((i) => (
              <li key={i.id} className="p-5">
                <p className="text-[13px] text-label-2">
                  {new Date(`${i.date}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })} · {i.org}
                </p>
                <p className="mt-1 text-[16px] font-semibold leading-snug">{i.title}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-8">
          <TextLink href="/threats">Open the threat dashboard</TextLink>
        </p>
      </SiteSection>

      {/* Vision */}
      <SiteSection id="vision" kicker="Vision" title="Every organisation should be able to use any AI model without giving away what makes it valuable." center>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Purpose", "Make AI safe to use on real work, by putting a checkpoint where data actually leaves: the prompt."],
            ["Principle", "Private by default, provider-neutral, explainable. Every decision says what it found and why."],
            ["Promise", "People keep the tools they like. Security keeps the evidence it needs. Nobody has to choose."],
          ].map(([t, d]) => (
            <div key={t} className="surface rounded-3xl p-7 text-left">
              <h3 className="text-[17px] font-semibold text-accent-text">{t}</h3>
              <p className="mt-2 text-[17px] leading-relaxed text-label">{d}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      {/* Foundations */}
      <SiteSection
        id="foundations"
        kicker="Engineering"
        title="Six agent-engineering foundations, one platform."
        lead="CipherMesh is a real agent, not a regex wrapper: it perceives, reasons over rules, runs concurrently, talks to other agents, negotiates and optimises. Each foundation is a tested module."
      >
        <ol className="grid gap-px overflow-hidden rounded-3xl bg-[var(--separator)] sm:grid-cols-2 lg:grid-cols-3">
          {FOUNDATIONS.map((f, i) => (
            <li key={f.name} className="bg-[rgb(var(--surface))] p-6">
              <p className="font-mono text-[12px] text-label-2">
                {String(i + 1).padStart(2, "0")} · {f.tag}
              </p>
              <h3 className="mt-2 text-[17px] font-semibold">{f.name}</h3>
              <p className="mt-1 text-[15px] text-label-2">{f.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8">
          <TextLink href="/architecture#foundations">See how each module runs, live</TextLink>
        </p>
      </SiteSection>

      {/* Developers */}
      <SiteSection id="developers" kicker="For Developers" title="One API call in front of any model.">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="text-[17px] leading-relaxed text-label-2">
              Send the prompt to CipherMesh instead of straight to the model. You get the decision, the cleaned text, the chosen provider, the model’s
              checked reply and a step-by-step trace.
            </p>
            <ul className="mt-6 flex flex-col gap-3 text-[15px]">
              {["REST and JSON, no SDK required", "Request IDs on every response", "Rate limits, body caps and security headers built in", "Self-host anywhere Python runs"].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              <TextLink href="/docs#quickstart">Quickstart</TextLink>
              <TextLink href="/docs#api">API reference</TextLink>
            </p>
          </div>
          <Code label="Inspect a prompt">{CURL}</Code>
        </div>
      </SiteSection>

      {/* CTA */}
      <section aria-labelledby="cta-title" className="mx-auto max-w-[1120px] px-4 sm:px-6">
        <div className="surface relative overflow-hidden rounded-[32px] px-6 py-14 text-center sm:px-12 sm:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-[70%] rounded-full bg-[rgb(var(--accent)/0.18)] blur-3xl" />
          <h2 id="cta-title" className="relative text-balance text-[32px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-[44px]">
            See what your prompts give away.
          </h2>
          <p className="relative mx-auto mt-4 max-w-[560px] text-[17px] leading-relaxed text-label-2">
            Paste a real prompt, or pick one of ten role-based examples. Nothing is stored; the original text never leaves the gateway.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/check" className={`inline-flex min-h-[48px] items-center gap-2 rounded-full bg-accent px-6 text-[16px] font-semibold text-white transition-colors hover:bg-accent-hover ${focusRing}`}>
              Open the Console
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/docs" className={`fill inline-flex min-h-[48px] items-center gap-2 rounded-full px-6 text-[16px] font-semibold text-label ${focusRing}`}>
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Read the Docs
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
