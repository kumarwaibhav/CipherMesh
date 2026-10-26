"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight, KeyRound, Link2, Loader2, MessageCircleQuestion, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { PROVIDER_OPTIONS, api, errorMessage, type InspectResponse, type TargetProvider } from "@/lib/api";
import { PENDING_EXAMPLE_KEY, RUN_EXAMPLE_EVENT, SAMPLES, type SampleKind } from "@/lib/samples";
import { OPEN_HELP_EVENT } from "./AppShell";
import { Checking, Comparison, Details, NoResultYet, ReplyCard, Verdict } from "./Result";
import type { TraceRun } from "./TelemetryTerminal";
import { ErrorBanner, buttonPrimary, focusRing } from "./ui";
import { POLL_INTERVAL_MS, usePolling } from "./usePolling";

const MAX_LEN = 65536;
const MAX_RUNS = 20;
const WELCOME_KEY = "cm-welcome-dismissed";

const SAMPLE_ICON: Record<SampleKind, typeof Sparkles> = {
  safe: MessageCircleQuestion,
  personal: UserRound,
  secret: KeyRound,
  internal: Link2,
};

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Paste", "Check", "See result"];
  return (
    <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2" aria-label="Progress">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < step;
        const current = n === step;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={current ? "step" : undefined}>
            <span
              className={`flex h-7 items-center gap-2 rounded-full pl-1 pr-3 text-[13px] font-semibold transition ${
                current ? "glass-strong text-label" : done ? "text-label" : "text-label-2"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  done ? "bg-allow text-white" : current ? "bg-tint text-white" : "well text-label-2"
                }`}
                aria-hidden="true"
              >
                {done ? "✓" : n}
              </span>
              {label}
              <span className="sr-only">{done ? " (done)" : current ? " (current step)" : ""}</span>
            </span>
            {i < steps.length - 1 ? <ArrowRight className="h-3.5 w-3.5 text-label-3" aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function Activity() {
  const fetchMetrics = useCallback((signal: AbortSignal) => api.metrics(signal), []);
  const { data } = usePolling(fetchMetrics, POLL_INTERVAL_MS);
  if (!data) return null;
  const d = data.decisions ?? { ALLOW: 0, REDACT: 0, REVIEW: 0, BLOCK: 0 };
  const items = [
    { label: "checked", value: data.requests_total, dot: "" },
    { label: "safe", value: d.ALLOW, dot: "bg-allow" },
    { label: "cleaned", value: d.REDACT, dot: "bg-redact" },
    { label: "waiting", value: d.REVIEW, dot: "bg-review" },
    { label: "blocked", value: d.BLOCK, dot: "bg-block" },
  ];
  return (
    <section aria-label="Activity on this server" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-2 text-sm text-label-2">
      <span className="font-semibold text-label">On this server</span>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          {it.dot ? <span className={`h-2 w-2 rounded-full ${it.dot}`} aria-hidden="true" /> : null}
          <span className="font-semibold tabular-nums text-label">{(it.value ?? 0).toLocaleString()}</span> {it.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        average <span className="font-semibold tabular-nums text-label">{data.mean_latency_ms.toFixed(0)} ms</span>
      </span>
    </section>
  );
}

export function Checker() {
  const promptId = useId();
  const providerId = useId();
  const hintId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<TargetProvider>("auto");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [result, setResult] = useState<InspectResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<TraceRun[]>([]);
  const [welcome, setWelcome] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const runCounter = useRef(0);

  useEffect(() => {
    try {
      setWelcome(window.localStorage.getItem(WELCOME_KEY) !== "1");
    } catch {
      setWelcome(true);
    }
  }, []);

  const dismissWelcome = () => {
    setWelcome(false);
    try {
      window.localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const run = useCallback(async (text: string, target: TargetProvider) => {
    if (!text.trim() || text.length > MAX_LEN) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setError(null);
    setSubmitted(text);
    try {
      const res = await api.inspect({ prompt: text, target_provider: target }, controller.signal);
      if (controller.signal.aborted) return;
      setResult(res);
      runCounter.current += 1;
      setRuns((prev) =>
        [
          ...prev,
          {
            key: `${res.request_id}-${runCounter.current}`,
            requestId: res.request_id,
            label: `inspect --target ${target}`,
            decision: res.action_decision,
            telemetry: Array.isArray(res.telemetry) ? res.telemetry : [],
            graphPath: Array.isArray(res.graph_path) ? res.graph_path : [],
          },
        ].slice(-MAX_RUNS),
      );
      setWelcome(false);
      try {
        window.localStorage.setItem(WELCOME_KEY, "1");
      } catch {
        /* ignore */
      }
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(errorMessage(err));
      setResult(null);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }, []);

  const runSample = useCallback(
    (id: string) => {
      const s = SAMPLES.find((x) => x.id === id);
      if (!s) return;
      setPrompt(s.text);
      void run(s.text, provider);
    },
    [provider, run],
  );

  // Examples launched from the help sheet, on this page or after navigating here.
  useEffect(() => {
    const onRun = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (id) runSample(id);
    };
    window.addEventListener(RUN_EXAMPLE_EVENT, onRun);
    try {
      const pending = window.sessionStorage.getItem(PENDING_EXAMPLE_KEY);
      if (pending) {
        window.sessionStorage.removeItem(PENDING_EXAMPLE_KEY);
        runSample(pending);
      }
    } catch {
      /* ignore */
    }
    return () => window.removeEventListener(RUN_EXAMPLE_EVENT, onRun);
  }, [runSample]);

  const tooLong = prompt.length > MAX_LEN;
  const canSubmit = !busy && prompt.trim().length > 0 && !tooLong;
  const step: 1 | 2 | 3 = result || busy ? 3 : prompt.trim() ? 2 : 1;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canSubmit) void run(prompt, provider);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (canSubmit) void run(prompt, provider);
    }
  };
  const focusEditor = () => {
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const reset = () => {
    setPrompt("");
    setResult(null);
    setSubmitted(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => textareaRef.current?.focus(), 250);
  };

  return (
    <main className="mx-auto flex max-w-[1040px] flex-col gap-8 px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="glass-thin inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold text-label-2">
          <ShieldCheck className="h-4 w-4 text-allow-text" aria-hidden="true" />
          Private by default · nothing leaves until it’s safe
        </span>
        <h1 className="max-w-3xl text-[34px] font-semibold leading-[1.1] tracking-tight text-label [text-wrap:balance] sm:text-5xl">
          Check a prompt before it reaches AI.
        </h1>
        <p className="max-w-2xl text-[17px] leading-relaxed text-label-2 sm:text-lg">
          Paste anything you’re about to send to an AI model. CipherMesh finds passwords, keys and personal details, hides
          or stops them, and shows you exactly what the AI will see.
        </p>
        <Stepper step={step} />
      </div>

      {welcome ? (
        <aside aria-label="Getting started" className="glass flex items-start gap-4 rounded-3xl p-4 sm:items-center sm:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-tint text-white">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 text-[15px] text-label">
            <span className="font-semibold">New here?</span> Tap an example below to see CipherMesh in action, or{" "}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_HELP_EVENT))}
              className={`rounded font-semibold text-tint-text underline-offset-2 hover:underline ${focusRing}`}
            >
              take the 20-second tour
            </button>
            .
          </p>
          <button
            type="button"
            onClick={dismissWelcome}
            aria-label="Dismiss"
            className={`well inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label-2 hover:text-label ${focusRing}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </aside>
      ) : null}

      <form onSubmit={onSubmit} className="glass-strong rounded-[32px] p-2 shadow-glass" noValidate>
        <label htmlFor={promptId} className="sr-only">
          Text to check
        </label>
        <textarea
          id={promptId}
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKeyDown}
          rows={5}
          spellCheck={false}
          aria-describedby={hintId}
          aria-invalid={tooLong || undefined}
          placeholder="Paste your prompt here. For example: “Summarise this email from priya@example.com about invoice 4471…”"
          className="block min-h-[150px] w-full resize-y rounded-[26px] bg-transparent px-5 py-4 text-[17px] leading-relaxed text-label placeholder:text-label-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-tint/25"
        />
        <div className="flex flex-col gap-3 px-3 pb-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={providerId} className="text-[13px] font-medium text-label-2">
              Send to
            </label>
            <select
              id={providerId}
              value={provider}
              onChange={(e) => setProvider(e.target.value as TargetProvider)}
              className={`well h-9 rounded-full border-0 pl-3 pr-8 text-[13px] font-semibold text-label ${focusRing}`}
            >
              {PROVIDER_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <span id={hintId} className={`text-[13px] ${tooLong ? "font-semibold text-block-text" : "text-label-2"}`}>
              {tooLong ? `Too long: ${prompt.length.toLocaleString()} of ${MAX_LEN.toLocaleString()} characters` : "Ctrl + Enter to check"}
            </span>
          </div>
          <button type="submit" disabled={!canSubmit} aria-busy={busy} className={`${buttonPrimary} ${focusRing} sm:min-w-[180px]`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            {busy ? "Checking…" : "Check prompt"}
          </button>
        </div>
      </form>

      <section aria-labelledby="examples-heading" className="-mt-3 flex flex-col items-center gap-3">
        <h2 id="examples-heading" className="text-[13px] font-semibold text-label-2">
          Not sure what to paste? Try an example
        </h2>
        <ul className="flex flex-wrap justify-center gap-2">
          {SAMPLES.map((s) => {
            const Icon = SAMPLE_ICON[s.kind];
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => runSample(s.id)}
                  disabled={busy}
                  title={s.hint}
                  className={`glass inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 text-sm font-semibold text-label transition hover:-translate-y-px hover:shadow-glass disabled:opacity-60 ${focusRing}`}
                >
                  <Icon className="h-4 w-4 text-label-2" aria-hidden="true" />
                  {s.label}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div ref={resultRef} className="flex scroll-mt-24 flex-col gap-4" aria-live="polite">
        {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
        {busy ? <Checking /> : null}
        {!busy && result ? (
          <>
            <Verdict result={result} onEdit={focusEditor} onReset={reset} />
            <Comparison original={submitted} result={result} />
            {result.response ? <ReplyCard response={result.response} /> : null}
            <Details result={result} runs={runs} busy={busy} />
          </>
        ) : null}
        {!busy && !result && !error ? <NoResultYet /> : null}
      </div>

      <Activity />
    </main>
  );
}
