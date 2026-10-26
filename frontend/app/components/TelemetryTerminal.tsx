"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Copy } from "lucide-react";
import type { ActionDecision, TelemetryLevel, TelemetryStep } from "@/lib/api";

export interface TraceRun {
  key: string;
  requestId: string;
  label: string;
  decision: ActionDecision;
  telemetry: TelemetryStep[];
  graphPath: string[];
}

const LEVEL_TEXT: Record<TelemetryLevel, string> = {
  info: "text-sky-300",
  success: "text-emerald-400",
  warn: "text-amber-300",
  block: "text-red-400",
};

const DECISION_TEXT: Record<ActionDecision, string> = {
  ALLOW: "text-emerald-400",
  REDACT: "text-amber-300",
  REVIEW: "text-sky-300",
  BLOCK: "text-red-400",
};

function formatStep(t: TelemetryStep): string {
  return `[${t.step}] ${t.node}  ${t.event}  ${t.detail}  (${t.elapsed_ms.toFixed(2)} ms)`;
}

export function traceToText(run: TraceRun): string {
  const lines = [
    `$ ciphermesh ${run.label} ${run.requestId}`,
    ...run.telemetry.map(formatStep),
    `graph_path: ${run.graphPath.join(" → ")}`,
    `decision: ${run.decision}`,
  ];
  return lines.join("\n");
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function TelemetryTerminal({ runs, busy }: { runs: TraceRun[]; busy: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const latest = runs.length ? runs[runs.length - 1] : null;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [runs, busy]);

  useEffect(() => {
    if (copyState === "idle") return;
    const id = window.setTimeout(() => setCopyState("idle"), 1800);
    return () => window.clearTimeout(id);
  }, [copyState]);

  const onCopy = async () => {
    if (!latest) return;
    setCopyState((await copyText(traceToText(latest))) ? "copied" : "failed");
  };

  return (
    <section
      aria-labelledby="terminal-title"
      className="force-dark min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-raised"
    >
      <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900/90 px-3 py-2">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
        </div>
        <h2 id="terminal-title" className="min-w-0 flex-1 truncate text-center font-mono text-xs text-zinc-400">
          ciphermesh — langgraph trace
        </h2>
        <button
          type="button"
          onClick={onCopy}
          disabled={!latest}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 font-mono text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Copy latest trace to clipboard"
        >
          {copyState === "copied" ? (
            <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
          ) : (
            <Copy className="h-3 w-3" aria-hidden="true" />
          )}
          {copyState === "copied" ? "copied" : copyState === "failed" ? "copy failed" : "copy trace"}
        </button>
      </div>

      {latest && latest.graphPath.length > 0 ? (
        <div
          role="region"
          aria-label="Graph path of latest run"
          tabIndex={0}
          className="scrollbar-thin flex items-center gap-1 overflow-x-auto border-b border-zinc-800/80 bg-zinc-950 px-3 py-2 font-mono text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
        >
          {latest.graphPath.map((node, i) => (
            <Fragment key={`${node}-${i}`}>
              {i > 0 ? <ChevronRight className="h-3 w-3 shrink-0 text-zinc-600" aria-hidden="true" /> : null}
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 ${
                  i === latest.graphPath.length - 1
                    ? "bg-red-600/20 text-red-200 ring-1 ring-inset ring-red-500/40"
                    : "bg-zinc-800/80 text-zinc-300"
                }`}
              >
                {node}
              </span>
            </Fragment>
          ))}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        role="log"
        aria-live="off"
        aria-label="Telemetry trace output"
        tabIndex={0}
        className="scrollbar-thin h-[300px] overflow-y-auto overflow-x-hidden px-3 py-3 font-mono text-[12px] leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 lg:h-[360px]"
      >
        {runs.length === 0 && !busy ? (
          <div className="text-zinc-400">
            <p>ciphermesh trace v2 — waiting for first request</p>
            <p className="mt-1">
              <span className="text-red-500">$</span> <span className="inline-block h-[1.05em] w-[0.55em] translate-y-[2px] animate-blink bg-zinc-300" aria-hidden="true" />
            </p>
          </div>
        ) : null}

        {runs.map((run) => (
          <div key={run.key} className="mb-3 animate-fade-in">
            <p className="break-all text-zinc-400">
              <span className="text-red-500">$</span> ciphermesh {run.label}{" "}
              <span className="text-zinc-300">{run.requestId}</span>
            </p>
            {run.telemetry.length === 0 ? (
              <p className="pl-2 text-zinc-400">(no telemetry emitted)</p>
            ) : (
              run.telemetry.map((t, i) => (
                <p key={`${t.step}-${i}`} className="break-words pl-2">
                  <span className="text-zinc-400">[{t.step}]</span>{" "}
                  <span className="text-zinc-200">{t.node}</span>{" "}
                  <span className={`font-semibold ${LEVEL_TEXT[t.level] ?? "text-zinc-300"}`}>{t.event}</span>{" "}
                  <span className="text-zinc-300">{t.detail}</span>{" "}
                  <span className="text-zinc-400">({t.elapsed_ms.toFixed(2)} ms)</span>
                </p>
              ))
            )}
            <p className="pl-2 text-zinc-400">
              → decision <span className={`font-semibold ${DECISION_TEXT[run.decision] ?? "text-zinc-200"}`}>{run.decision}</span>
            </p>
          </div>
        ))}

        {busy ? (
          <p className="text-zinc-400">
            <span className="text-red-500">$</span> running graph
            <span className="ml-1 inline-block h-[1.05em] w-[0.55em] translate-y-[2px] animate-blink bg-zinc-300" aria-hidden="true" />
          </p>
        ) : runs.length > 0 ? (
          <p>
            <span className="text-red-500">$</span>{" "}
            <span className="inline-block h-[1.05em] w-[0.55em] translate-y-[2px] animate-blink bg-zinc-300" aria-hidden="true" />
          </p>
        ) : null}
      </div>
    </section>
  );
}
