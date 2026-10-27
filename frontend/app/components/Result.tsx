"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, Copy, Cpu, FileText, Inbox, PenLine, RotateCcw, ShieldCheck } from "lucide-react";
import type { ActionDecision, Finding, InspectResponse } from "@/lib/api";
import { categoryName, findingKind, KIND_DECISION, verdictCopy } from "@/lib/friendly";
import type { TraceRun } from "@/lib/session";
import { FindingsDetails, RoutingDetails, VaultDetails } from "./ResultPanels";
import { TelemetryTerminal } from "./TelemetryTerminal";
import { Collapsible } from "./Collapsible";
import { STATUS, buttonPlain, buttonPrimary, focusRing } from "./ui";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Arrow keys, Home and End move between tabs, as in a native segmented control. */
function tabKeys<T extends string>(e: KeyboardEvent<HTMLButtonElement>, ids: T[], current: T, set: (id: T) => void, prefix: string) {
  const i = ids.indexOf(current);
  const next =
    e.key === "ArrowRight" ? ids[(i + 1) % ids.length] : e.key === "ArrowLeft" ? ids[(i - 1 + ids.length) % ids.length] : e.key === "Home" ? ids[0] : e.key === "End" ? ids[ids.length - 1] : null;
  if (!next) return;
  e.preventDefault();
  set(next);
  document.getElementById(`${prefix}-${next}`)?.focus();
}

/** The answer: one status glyph, a plain headline, one sentence, one next step, one primary action. */
export function Verdict({
  result,
  onEdit,
  onReset,
  showApprovalsLink = true,
  resetLabel = "Check Another",
}: {
  result: InspectResponse;
  onEdit?: () => void;
  onReset?: () => void;
  showApprovalsLink?: boolean;
  resetLabel?: string;
}) {
  const copy = verdictCopy(result);
  const s = STATUS[copy.tone];
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [result.request_id, result.status]);

  useEffect(() => {
    if (copied === "idle") return;
    const id = window.setTimeout(() => setCopied("idle"), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  const clean = result.processed_prompt;
  const waiting = result.action_decision === "REVIEW" && result.status === "PENDING_REVIEW";
  const primary =
    waiting && showApprovalsLink ? (
      <Link href="/approvals" className={`${buttonPrimary} ${focusRing}`}>
        <Inbox className="h-4 w-4" aria-hidden="true" />
        Open Approvals
      </Link>
    ) : result.action_decision === "REDACT" && clean ? (
      <button type="button" onClick={async () => setCopied((await copyText(clean)) ? "ok" : "fail")} className={`${buttonPrimary} ${focusRing}`}>
        {copied === "ok" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {copied === "ok" ? "Copied" : copied === "fail" ? "Copying isn’t allowed here" : "Copy Cleaned Text"}
      </button>
    ) : result.action_decision === "BLOCK" && onEdit ? (
      <button type="button" onClick={onEdit} className={`${buttonPrimary} ${focusRing}`}>
        <PenLine className="h-4 w-4" aria-hidden="true" />
        Edit My Text
      </button>
    ) : null;

  return (
    <section aria-labelledby="verdict-heading" className="surface animate-rise rounded-2xl">
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <p className={`flex items-center gap-1.5 text-[15px] font-semibold ${s.text}`}>
          <s.Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          {s.word}
        </p>
        <div>
          <h2 id="verdict-heading" ref={headingRef} tabIndex={-1} className="text-[22px] font-bold leading-tight tracking-[-0.02em] focus:outline-none sm:text-[26px]">
            {copy.headline}
          </h2>
          <p className="mt-2 max-w-[62ch] text-[17px] leading-relaxed text-label">{copy.body}</p>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-label-2">
            <span className="sr-only">Next step: </span>
            {copy.next}
          </p>
        </div>
        {primary || onReset ? (
          <div className="flex flex-wrap items-center gap-2">
            {primary}
            {onReset ? (
              <button type="button" onClick={onReset} className={`${buttonPlain} ${focusRing}`}>
                {resetLabel === "Check Another" ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : null}
                {resetLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

const UNDERLINE: Record<ActionDecision, string> = {
  ALLOW: "decoration-allow",
  REDACT: "decoration-redact",
  REVIEW: "decoration-review",
  BLOCK: "decoration-block",
};

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
          <mark key={i} className={`finding ${UNDERLINE[KIND_DECISION[findingKind(p.f)]]}`} title={categoryName(p.f.category)}>
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

const TOKEN_RE = /\[REDACTED:[^\]\s]+\]/g;

/**
 * The signature: each private value is shown for a beat, a redaction bar sweeps across exactly that
 * value, and the bar is labelled with what it hides. The bar keeps the width of what it covers.
 */
function SealedText({ text, sweep, originals }: { text: string; sweep: boolean; originals: Map<string, string[]> | null }) {
  const parts: Array<{ token: boolean; value: string }> = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push({ token: false, value: text.slice(last, idx) });
    parts.push({ token: true, value: m[0] });
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push({ token: false, value: text.slice(last) });
  const queues = new Map<string, string[]>();
  originals?.forEach((v, k) => queues.set(k, [...v]));
  let n = 0;
  return (
    <>
      {parts.map((p, i) => {
        if (!p.token) return <span key={i}>{p.value}</span>;
        const key = p.value.slice(10, -1).toLowerCase();
        const name = categoryName(key);
        const orig = queues.get(key)?.shift();
        const delay = 260 + n++ * 180;
        return (
          <span key={i} className="redaction" data-sweep={sweep} style={{ ["--delay" as string]: `${delay}ms` }} title={p.value}>
            {orig ? (
              <span className="redaction-orig" aria-hidden="true">
                {orig}
              </span>
            ) : null}
            <span className="redaction-label">{name} hidden</span>
            <span className="sr-only"> ({p.value})</span>
          </span>
        );
      })}
    </>
  );
}

type View = "sent" | "original";

export function PromptDocument({ original, result }: { original: string | null; result: InspectResponse }) {
  const findings = Array.isArray(result.findings) ? result.findings : [];
  const copy = verdictCopy(result);
  const approvedLocal = result.action_decision === "REVIEW" && result.status === "COMPLETED";
  const [view, setView] = useState<View>("sent");
  const [sweep, setSweep] = useState(true);
  const groupId = useId();

  // The sweep plays once per result; switching views afterwards shows the finished state.
  useEffect(() => {
    setView("sent");
    setSweep(true);
    const id = window.setTimeout(() => setSweep(false), 4000);
    return () => window.clearTimeout(id);
  }, [result.request_id, result.status]);

  const originals = new Map<string, string[]>();
  if (original) {
    for (const f of [...findings].sort((a, b) => a.start - b.start)) {
      if (f.start < 0 || f.end > original.length || f.end <= f.start) continue;
      const key = f.category.toLowerCase();
      originals.set(key, [...(originals.get(key) ?? []), original.slice(f.start, f.end)]);
    }
  }

  const options: Array<{ id: View; label: string }> = original
    ? [
        { id: "sent", label: "What the AI Receives" },
        { id: "original", label: "What You Wrote" },
      ]
    : [{ id: "sent", label: "What the AI Receives" }];

  return (
    <Collapsible
      title="Your Prompt"
      icon={<FileText className="h-5 w-5" aria-hidden="true" />}
      meta={approvedLocal ? "Approved by a reviewer" : findings.length === 0 ? "Nothing needed changing" : `${findings.length} found`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5">
        {options.length > 1 ? (
          <div role="tablist" aria-label="Show" className="fill flex rounded-[10px] p-0.5">
            {options.map((o) => (
              <button
                key={o.id}
                id={`${groupId}-tab-${o.id}`}
                role="tab"
                type="button"
                aria-selected={view === o.id}
                aria-controls={`${groupId}-panel`}
                tabIndex={view === o.id ? 0 : -1}
                onKeyDown={(e) =>
                  tabKeys(e, options.map((x) => x.id), view, (id) => {
                    setSweep(false);
                    setView(id);
                  }, `${groupId}-tab`)
                }
                onClick={() => {
                  setSweep(false);
                  setView(o.id);
                }}
                className={`h-10 rounded-[8px] px-3 text-[13px] transition sm:h-8 ${focusRing} ${
                  view === o.id ? "bg-[rgb(var(--surface))] font-semibold text-label shadow-surface ring-1 ring-[rgb(var(--label)/0.12)]" : "font-medium text-label-2 hover:text-label"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[15px] font-semibold">What the AI Receives</p>
        )}
        <p className="text-[13px] text-label-2 sm:hidden">
          {approvedLocal ? "Approved by a reviewer" : findings.length === 0 ? "Nothing needed changing" : `${findings.length} found`}
        </p>
      </div>

      <div role={options.length > 1 ? "tabpanel" : undefined} id={`${groupId}-panel`} aria-labelledby={options.length > 1 ? `${groupId}-tab-${view}` : undefined} className="px-5 pb-5 pt-3">
        {view === "original" && original ? (
          <p className="whitespace-pre-wrap break-words font-mono text-[15px] leading-8 text-label">
            <MarkedText text={original} findings={findings} />
          </p>
        ) : approvedLocal ? (
          <p className="flex items-start gap-2.5 text-[15px] leading-relaxed text-label">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-allow-text" aria-hidden="true" />
            The full text went only to the private model inside your company. It never left your network.
          </p>
        ) : copy.sent && result.processed_prompt ? (
          <p className="whitespace-pre-wrap break-words font-mono text-[15px] leading-8 text-label">
            <SealedText text={result.processed_prompt} sweep={sweep} originals={original ? originals : null} />
          </p>
        ) : (
          <p className="text-[15px] leading-relaxed text-label-2">
            {result.status === "PENDING_REVIEW" ? "Nothing yet. It waits for a person to approve it." : "Nothing. This text was not sent to any AI model."}
          </p>
        )}

      </div>
    </Collapsible>
  );
}

type Tab = "route" | "trace" | "vault" | "findings";

export function Details({ result, runs }: { result: InspectResponse; runs: TraceRun[] }) {
  const [tab, setTab] = useState<Tab>(result.route ? "route" : "trace");
  const tabs: Array<{ id: Tab; label: string; show: boolean }> = [
    { id: "route", label: "Model Choice", show: Boolean(result.route) },
    { id: "trace", label: "Log", show: true },
    { id: "vault", label: "Encryption", show: true },
    { id: "findings", label: "Rules", show: true },
  ];
  const visible = tabs.filter((t) => t.show);
  const active = visible.some((t) => t.id === tab) ? tab : visible[0].id;

  return (
    <Collapsible
      title="Technical Details"
      icon={<Cpu className="h-5 w-5" aria-hidden="true" />}
      meta="Model Choice · Log · Encryption · Rules"
      defaultOpen={false}
    >
      <div className="sep flex flex-col gap-4 border-t px-5 pb-5 pt-4">
        <div role="tablist" aria-label="Technical details" className="fill flex flex-wrap gap-0.5 self-start rounded-[10px] p-0.5">
          {visible.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              id={`tab-${t.id}`}
              aria-selected={active === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={active === t.id ? 0 : -1}
              onKeyDown={(e) => tabKeys(e, visible.map((x) => x.id), active, setTab, "tab")}
              onClick={() => setTab(t.id)}
              className={`h-10 rounded-[8px] px-3 text-[13px] transition sm:h-8 ${focusRing} ${
                active === t.id ? "bg-[rgb(var(--surface))] font-semibold text-label shadow-surface ring-1 ring-[rgb(var(--label)/0.12)]" : "font-medium text-label-2 hover:text-label"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
          {active === "route" && result.route ? <RoutingDetails route={result.route} /> : null}
          {active === "trace" ? <TelemetryTerminal runs={runs} busy={false} /> : null}
          {active === "vault" ? <VaultDetails vault={result.vault} /> : null}
          {active === "findings" ? <FindingsDetails findings={Array.isArray(result.findings) ? result.findings : []} /> : null}
        </div>
      </div>
    </Collapsible>
  );
}

/** Determinate-feeling progress while the gateway works (usually well under a second). */
export function Checking() {
  const steps = ["Looking for secrets", "Hiding personal details", "Choosing the safest model"];
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const show = window.setTimeout(() => setShown(true), 250);
    const id = window.setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), 300);
    return () => {
      window.clearTimeout(show);
      window.clearInterval(id);
    };
  }, [steps.length]);
  if (!shown) return null;
  return (
    <section aria-live="polite" aria-label="Checking" className="surface flex flex-col gap-3 rounded-2xl p-5">
      <div className="fill h-1 overflow-hidden rounded-full">
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
      </div>
      <p className="text-[15px] text-label">
        {steps[i]}
        <span className="text-label-2">…</span>
      </p>
    </section>
  );
}
