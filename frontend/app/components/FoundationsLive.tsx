"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { api, errorMessage, type InspectResponse } from "@/lib/api";
import { SAMPLES } from "@/lib/samples";
import { useSession } from "@/lib/session";
import { STATUS, focusRing } from "./ui";

type ModuleId = "peas" | "reflex" | "runtime" | "messaging" | "negotiation" | "utility" | "vault" | "review" | "reply";

export const FOUNDATIONS: ReadonlyArray<{
  id: ModuleId;
  name: string;
  theory: string;
  role: string;
  code: string;
  where: string;
  trace: string;
}> = [
  {
    id: "peas",
    name: "Agent Specification & Measurement",
    theory: "PEAS model: performance, environment, actuators, sensors",
    role: "Defines what the agent perceives (a prompt and a target), what it may do (allow, redact, hold, block), and measures itself: critical recall, false-block rate, p50/p95 latency.",
    code: "ciphermesh/models.py · evaluation.py",
    where: "Every request: the perceive step",
    trace: "Course module 1.1",
  },
  {
    id: "reflex",
    name: "Rule-Based Decision Engine",
    theory: "Simple reflex agent: condition–action rules",
    role: "25 detectors (D1–D12) with checksum validation and de-obfuscation feed five policy rules (R1–R5). The highest-risk finding decides; malformed input is rejected, never guessed.",
    code: "ciphermesh/detector.py · policy.py · stream.py",
    where: "Every request: detect and decide",
    trace: "Course module 1.2",
  },
  {
    id: "runtime",
    name: "Concurrent Runtime & Health Monitor",
    theory: "Threads, worker pools and daemon monitoring",
    role: "A bounded worker pool with back-pressure, lock-guarded shared state, and a monitor that feeds each provider’s circuit breaker so failing models are skipped automatically.",
    code: "ciphermesh/runtime.py · providers.py",
    where: "Dispatch: attempts, fallback, circuit breaker",
    trace: "Course module 2.1",
  },
  {
    id: "messaging",
    name: "Signed Agent Messaging",
    theory: "Distributed agents over sockets and RPC",
    role: "Length-framed TCP with HMAC-SHA256 signatures and freshness checks. Other agents can sync state, submit work, approve reviews or push redaction patterns.",
    code: "ciphermesh/transport.py · server.py · client.py",
    where: "Node mode: agent-to-agent, outside the HTTP path",
    trace: "Course module 2.2",
  },
  {
    id: "negotiation",
    name: "Contract-Net Procurement",
    theory: "Multi-agent negotiation and consensus",
    role: "A buyer agent issues calls for proposals, counters supplier offers with bounded concessions, and commits prices through a two-phase handshake over a SHA-256 digest.",
    code: "ciphermesh/negotiation/ · procurement.py",
    where: "Dispatch: negotiated prices",
    trace: "Course module 3.1",
  },
  {
    id: "utility",
    name: "Constrained Utility Router",
    theory: "Self-interested utility optimisation",
    role: "Residency, budget, latency and circuit state are hard limits; inside them the router maximises U = 0.30·Quality + 0.25·Cost + 0.20·Latency + 0.15·Availability + 0.10·Privacy, verified against an exhaustive search.",
    code: "ciphermesh/routing.py · optimization/",
    where: "Dispatch: choose the model",
    trace: "Course module 3.2",
  },
];

const PLATFORM: ReadonlyArray<{ id: ModuleId; name: string }> = [
  { id: "vault", name: "Evidence Vault" },
  { id: "review", name: "Approval Queue" },
  { id: "reply", name: "Reply Inspection" },
];

const EVENT_MODULE: Record<string, ModuleId> = {
  PERCEIVE: "peas",
  DETECT: "reflex",
  DECISION: "reflex",
  SEAL: "vault",
  VERIFY: "vault",
  BLOCKED: "reflex",
  HOLD: "review",
  FAIL_CLOSED: "review",
  PROCURE: "negotiation",
  ROUTE: "utility",
  POLICY: "utility",
  ATTEMPT: "runtime",
  RESPONSE_INSPECT: "reply",
  COMPLETE: "runtime",
};

const RUNNABLE = ["support", "sre", "backend", "pm"] as const;

/**
 * Runs a real check against the gateway and replays its telemetry, lighting up each engineering
 * module the moment it acts on the request. Nothing here is simulated: the trace comes from the API.
 */
export function FoundationsLive() {
  const { last, record } = useSession();
  const [result, setResult] = useState<InspectResponse | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (last && !result) {
      setResult(last.result);
      setStep(last.result.telemetry.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last]);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const run = async (id: string) => {
    const s = SAMPLES.find((x) => x.id === id);
    if (!s) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.inspect({ prompt: s.text, target_provider: "auto" });
      record(res, s.text, `inspect · ${s.role}`);
      setResult(res);
      setStep(0);
      if (timer.current) window.clearInterval(timer.current);
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduce) setStep(res.telemetry.length);
      else
        timer.current = window.setInterval(() => {
          setStep((n) => {
            if (n >= res.telemetry.length) {
              if (timer.current) window.clearInterval(timer.current);
              return n;
            }
            return n + 1;
          });
        }, 260);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const events = result ? result.telemetry.slice(0, step) : [];
  const lit = new Set(events.map((e) => EVENT_MODULE[e.event]).filter(Boolean));
  const current = events.length ? EVENT_MODULE[events[events.length - 1].event] : undefined;
  const s = result ? STATUS[result.action_decision] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="surface flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-semibold">Run a Live Check</h3>
            <p className="mt-0.5 text-[13px] text-label-2">Sends a real prompt to the gateway and lights each module as it acts.</p>
          </div>
          {s ? (
            <span className={`flex items-center gap-1.5 text-[15px] font-semibold ${s.text}`}>
              <s.Icon className="h-4 w-4" aria-hidden="true" />
              {s.word} · {result?.graph_path.join(" → ")}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {RUNNABLE.map((id) => {
            const sample = SAMPLES.find((x) => x.id === id);
            return sample ? (
              <button
                key={id}
                type="button"
                disabled={busy}
                onClick={() => run(id)}
                className={`fill inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-label transition-colors hover:bg-[var(--fill)] disabled:opacity-50 sm:min-h-[36px] ${focusRing}`}
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
                {sample.role}
              </button>
            ) : null;
          })}
        </div>
        {error ? <p className="text-[15px] font-medium text-block-text">{error}</p> : null}
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FOUNDATIONS.map((f, i) => {
          const on = lit.has(f.id);
          const now = current === f.id;
          return (
            <li
              key={f.id}
              className={`surface relative flex flex-col rounded-3xl p-5 transition-[box-shadow,transform] duration-300 ${now ? "-translate-y-0.5 ring-2 ring-accent" : on ? "ring-1 ring-[rgb(var(--accent)/0.5)]" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[12px] text-label-2">{String(i + 1).padStart(2, "0")}</span>
                <span className={`flex items-center gap-1.5 text-[12px] font-semibold ${on ? "text-accent-text" : "text-label-2"}`}>
                  <span className={`h-2 w-2 rounded-full ${on ? "bg-accent" : "bg-[var(--fill)]"} ${now ? "animate-pulse" : ""}`} aria-hidden="true" />
                  {on ? "Active on this request" : f.id === "messaging" ? "Node mode" : "Idle"}
                </span>
              </div>
              <h3 className="mt-3 text-[17px] font-semibold leading-snug">{f.name}</h3>
              <p className="mt-0.5 text-[13px] text-accent-text">{f.theory}</p>
              <p className="mt-3 flex-1 text-[14px] leading-relaxed text-label-2">{f.role}</p>
              <dl className="sep mt-4 grid gap-1 border-t pt-3 text-[12px]">
                <div className="flex gap-2">
                  <dt className="w-12 shrink-0 text-label-2">Runs</dt>
                  <dd className="text-label">{f.where}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-12 shrink-0 text-label-2">Code</dt>
                  <dd className="flex flex-wrap gap-x-2 font-mono text-label">
                    {f.code.split(" · ").map((c) => (
                      <span key={c} className="whitespace-nowrap">
                        {c}
                      </span>
                    ))}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-12 shrink-0 text-label-2">Trace</dt>
                  <dd className="text-label-2">21CSE525T · {f.trace}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ol>

      <div className="surface rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-label-2">Platform services:</span>
          {PLATFORM.map((p) => (
            <span
              key={p.id}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ${lit.has(p.id) ? "bg-[rgb(var(--accent)/0.14)] text-accent-text" : "fill text-label-2"}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${lit.has(p.id) ? "bg-accent" : "bg-label-3"}`} aria-hidden="true" />
              {p.name}
            </span>
          ))}
        </div>
        <ol className="force-dark scrollbar-thin mt-4 max-h-[280px] overflow-y-auto rounded-2xl bg-zinc-950 p-4 font-mono text-[12px] leading-6 text-zinc-300" aria-label="Telemetry" aria-live="polite">
          {events.length === 0 ? (
            <li className="text-zinc-400">$ waiting for a request… choose a role above</li>
          ) : (
            events.map((e) => (
              <li key={e.step} className="flex gap-3">
                <span className="w-6 shrink-0 text-right text-zinc-500">{e.step}</span>
                <span className="w-32 shrink-0 truncate text-sky-300">{e.node}</span>
                <span className="w-28 shrink-0 font-semibold text-zinc-100">{e.event}</span>
                <span className="min-w-0 break-words">{e.detail}</span>
              </li>
            ))
          )}
        </ol>
      </div>
    </div>
  );
}
