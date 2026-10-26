"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Ban, Check, CheckCircle2, ChevronDown, Clock, Copy, EyeOff, Inbox, PenLine, RotateCcw, ShieldCheck } from "lucide-react";
import type { ActionDecision, Finding, InspectResponse } from "@/lib/api";
import { categoryName, findingKind, KIND_DECISION, verdictCopy } from "@/lib/friendly";
import { RedactedText } from "./RedactedText";
import { FindingsDetails, ReplyCard, RoutingDetails, VaultDetails } from "./ResultPanels";
import { TelemetryTerminal, type TraceRun } from "./TelemetryTerminal";
import { DECISION_STYLES, buttonPrimary, buttonSecondary, focusRing } from "./ui";

const ICON: Record<ActionDecision, typeof Check> = {
  ALLOW: CheckCircle2,
  REDACT: EyeOff,
  REVIEW: Clock,
  BLOCK: Ban,
};

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  return false;
}

export function Verdict({
  result,
  onEdit,
  onReset,
  showApprovalsLink = true,
}: {
  result: InspectResponse;
  onEdit?: () => void;
  onReset?: () => void;
  showApprovalsLink?: boolean;
}) {
  const copy = verdictCopy(result);
  const style = DECISION_STYLES[copy.tone];
  const Icon = ICON[copy.tone];
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the answer so keyboard and screen-reader users land on it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [result.request_id, result.status]);

  useEffect(() => {
    if (copied === "idle") return;
    const id = window.setTimeout(() => setCopied("idle"), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  const cleanText = result.processed_prompt;
  const waiting = result.action_decision === "REVIEW" && result.status === "PENDING_REVIEW";

  return (
    <section aria-labelledby="verdict-heading" className={`glass animate-fade-in rounded-[28px] border ${style.card} p-6 sm:p-7`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${style.icon} shadow-lg`}>
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="verdict-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold tracking-tight text-label focus:outline-none sm:text-[28px]"
          >
            {copy.headline}
          </h2>
          <p className="mt-2 text-[17px] leading-relaxed text-label">{copy.body}</p>
          <p className={`mt-3 flex items-start gap-2 text-[15px] font-medium ${style.text}`}>
            <span aria-hidden="true">→</span>
            <span>
              <span className="sr-only">Next step: </span>
              {copy.next}
            </span>
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {waiting && showApprovalsLink ? (
              <Link href="/approvals" className={`${buttonPrimary} ${focusRing}`}>
                <Inbox className="h-4 w-4" aria-hidden="true" />
                Open Approvals
              </Link>
            ) : null}
            {result.action_decision === "REDACT" && cleanText ? (
              <button
                type="button"
                onClick={async () => setCopied((await copyText(cleanText)) ? "ok" : "fail")}
                className={`${buttonPrimary} ${focusRing}`}
              >
                {copied === "ok" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                {copied === "ok" ? "Copied" : copied === "fail" ? "Copy not allowed here" : "Copy cleaned text"}
              </button>
            ) : null}
            {result.action_decision === "BLOCK" && onEdit ? (
              <button type="button" onClick={onEdit} className={`${buttonPrimary} ${focusRing}`}>
                <PenLine className="h-4 w-4" aria-hidden="true" />
                Edit my text
              </button>
            ) : null}
            {onReset ? (
              <button type="button" onClick={onReset} className={`${buttonSecondary} ${focusRing}`}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Check another
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

const MARK_STYLE: Record<ActionDecision, string> = {
  ALLOW: "bg-allow/20",
  REDACT: "bg-redact/25 ring-1 ring-redact/40",
  REVIEW: "bg-review/20 ring-1 ring-review/40",
  BLOCK: "bg-block/20 ring-1 ring-block/45",
};

/** The user's own text with every detected value highlighted and named. */
function MarkedText({ text, findings }: { text: string; findings: Finding[] }) {
  const sorted = [...findings].filter((f) => f.end > f.start && f.start >= 0 && f.end <= text.length).sort((a, b) => a.start - b.start);
  const parts: Array<{ text: string; f?: Finding }> = [];
  let cursor = 0;
  for (const f of sorted) {
    if (f.start < cursor) continue;
    if (f.start > cursor) parts.push({ text: text.slice(cursor, f.start) });
    parts.push({ text: text.slice(f.start, f.end), f });
    cursor = f.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return (
    <>
      {parts.map((p, i) =>
        p.f ? (
          <mark key={i} className={`finding ${MARK_STYLE[KIND_DECISION[findingKind(p.f)]]}`} title={categoryName(p.f.category)}>
            {p.text}
            <span className="sr-only"> (found: {categoryName(p.f.category)})</span>
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

const CHIP: Record<ActionDecision, { cls: string; action: string }> = {
  ALLOW: { cls: "bg-allow/15 text-allow-text", action: "ok" },
  REDACT: { cls: "bg-redact/15 text-redact-text", action: "hidden" },
  REVIEW: { cls: "bg-review/15 text-review-text", action: "needs approval" },
  BLOCK: { cls: "bg-block/15 text-block-text", action: "stopped" },
};

export function Comparison({ original, result }: { original: string | null; result: InspectResponse }) {
  const findings = Array.isArray(result.findings) ? result.findings : [];
  const copy = verdictCopy(result);
  const chips = new Map<string, ActionDecision>();
  for (const f of findings) chips.set(categoryName(f.category), KIND_DECISION[findingKind(f)]);

  return (
    <section aria-labelledby="compare-heading" className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="compare-heading" className="text-[17px] font-semibold tracking-tight">
          What the AI receives
        </h2>
        <p className="text-sm text-label-2">
          {result.action_decision === "REVIEW" && result.status === "COMPLETED"
            ? "Approved by a reviewer"
            : findings.length === 0
              ? "Nothing needed changing"
              : `Found ${findings.length} item${findings.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {chips.size > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="What CipherMesh found">
          {[...chips.entries()].map(([name, d]) => (
            <li key={name} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ${CHIP[d].cls}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${DECISION_STYLES[d].dot}`} aria-hidden="true" />
              {name} · {CHIP[d].action}
            </li>
          ))}
        </ul>
      ) : null}

      <div className={`mt-4 grid grid-cols-1 gap-3 ${original ? "lg:grid-cols-2" : ""}`}>
        {original ? (
          <div className="flex min-w-0 flex-col gap-1.5">
            <h3 className="text-[13px] font-semibold text-label-2">You wrote</h3>
            <p className="well min-h-[88px] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 font-mono text-[14px] leading-7 text-label">
              <MarkedText text={original} findings={findings} />
            </p>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="text-[13px] font-semibold text-label-2">AI receives</h3>
          {result.action_decision === "REVIEW" && result.status === "COMPLETED" ? (
            <p className="flex min-h-[88px] items-center gap-2 rounded-2xl bg-allow/[0.08] px-4 py-3 text-[15px] font-medium text-label">
              <ShieldCheck className="h-5 w-5 shrink-0 text-allow-text" aria-hidden="true" />
              The full text went only to the private local model inside your company. It never left your network.
            </p>
          ) : copy.sent && result.processed_prompt ? (
            <p className="well min-h-[88px] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 font-mono text-[14px] leading-7 text-label">
              <RedactedText text={result.processed_prompt} />
            </p>
          ) : (
            <p className="flex min-h-[88px] items-center gap-2 rounded-2xl border border-dashed border-label-3/40 px-4 py-3 text-[15px] font-medium text-label-2">
              <Ban className="h-4 w-4 shrink-0" aria-hidden="true" />
              {result.status === "PENDING_REVIEW" ? "Nothing yet. It waits for a person to approve it." : "Nothing. This text was not sent."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

type Tab = "route" | "trace" | "vault" | "findings";

export function Details({ result, runs, busy }: { result: InspectResponse; runs: TraceRun[]; busy: boolean }) {
  const [tab, setTab] = useState<Tab>("route");
  const tabs: Array<{ id: Tab; label: string; show: boolean }> = [
    { id: "route", label: "Model choice", show: Boolean(result.route) },
    { id: "trace", label: "Step-by-step log", show: true },
    { id: "vault", label: "Encryption", show: true },
    { id: "findings", label: "Detection rules", show: true },
  ];
  const visible = tabs.filter((t) => t.show);
  const active = visible.some((t) => t.id === tab) ? tab : visible[0].id;

  return (
    <details className="glass group rounded-3xl">
      <summary className={`flex cursor-pointer list-none items-center justify-between gap-3 rounded-3xl px-5 py-4 ${focusRing} [&::-webkit-details-marker]:hidden`}>
        <span>
          <span className="block text-[15px] font-semibold text-label">Technical details</span>
          <span className="block text-sm text-label-2">For engineers and auditors: model choice, full log, encryption and rules</span>
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 text-label-2 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="flex flex-col gap-4 px-5 pb-5">
        <div role="tablist" aria-label="Technical details" className="well flex flex-wrap gap-0.5 self-start rounded-full p-1">
          {visible.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              id={`tab-${t.id}`}
              aria-selected={active === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`h-8 rounded-full px-3.5 text-[13px] font-semibold transition ${focusRing} ${
                active === t.id ? "glass-strong text-label" : "text-label-2 hover:text-label"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
          {active === "route" && result.route ? <RoutingDetails route={result.route} /> : null}
          {active === "trace" ? <TelemetryTerminal runs={runs} busy={busy} /> : null}
          {active === "vault" ? <VaultDetails vault={result.vault} /> : null}
          {active === "findings" ? <FindingsDetails findings={Array.isArray(result.findings) ? result.findings : []} /> : null}
        </div>
      </div>
    </details>
  );
}

export { ReplyCard };

export function NoResultYet() {
  const items: Array<{ d: ActionDecision; title: string; text: string }> = [
    { d: "ALLOW", title: "Safe", text: "Nothing private. Sent as written." },
    { d: "REDACT", title: "Cleaned", text: "Personal details hidden, then sent." },
    { d: "REVIEW", title: "Waiting", text: "A person approves it first." },
    { d: "BLOCK", title: "Blocked", text: "A secret was found. Nothing sent." },
  ];
  return (
    <section aria-labelledby="outcomes-heading" className="flex flex-col gap-3">
      <h2 id="outcomes-heading" className="px-1 text-[15px] font-semibold text-label-2">
        Your result will be one of these
      </h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map(({ d, title, text }) => {
          const Icon = ICON[d];
          return (
            <li key={d} className="glass flex flex-col gap-2 rounded-3xl p-4">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${DECISION_STYLES[d].icon}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className={`text-[15px] font-semibold ${DECISION_STYLES[d].text}`}>{title}</span>
              <span className="text-sm leading-snug text-label-2">{text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Checking() {
  const steps = ["Looking for secrets and passwords", "Hiding personal details", "Choosing the safest AI model"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), 350);
    return () => window.clearInterval(id);
  }, [steps.length]);
  return (
    <section aria-live="polite" className="glass flex flex-col gap-3 rounded-[28px] p-6">
      <p className="text-[17px] font-semibold">Checking your prompt…</p>
      <ol className="flex flex-col gap-2">
        {steps.map((s, n) => (
          <li key={s} className={`flex items-center gap-2.5 text-[15px] ${n <= i ? "text-label" : "text-label-3"}`}>
            <span className={`h-2 w-2 rounded-full ${n < i ? "bg-allow" : n === i ? "animate-pulse bg-tint" : "bg-label-3/40"}`} aria-hidden="true" />
            {s}
          </li>
        ))}
      </ol>
    </section>
  );
}

