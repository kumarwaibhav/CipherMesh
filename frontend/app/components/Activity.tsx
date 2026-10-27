"use client";

import Link from "next/link";
import { useCallback } from "react";
import { providerLabel, api, type ActionDecision } from "@/lib/api";
import { useSession } from "@/lib/session";
import { LargeTitle } from "./AppShell";
import { RedactedText } from "./RedactedText";
import { STATUS, StatusLabel, buttonPrimary, focusRing } from "./ui";
import { POLL_INTERVAL_MS, usePolling } from "./usePolling";

const ORDER: ActionDecision[] = ["ALLOW", "REDACT", "REVIEW", "BLOCK"];

function timeAgo(at: number): string {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return "Just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function Activity() {
  const { history } = useSession();
  const fetchMetrics = useCallback((signal: AbortSignal) => api.metrics(signal), []);
  const { data } = usePolling(fetchMetrics, POLL_INTERVAL_MS);
  const d = data?.decisions ?? { ALLOW: 0, REDACT: 0, REVIEW: 0, BLOCK: 0 };
  const total = data?.requests_total ?? 0;
  const protectedCount = (d.REDACT ?? 0) + (d.REVIEW ?? 0) + (d.BLOCK ?? 0);

  return (
    <main className="mx-auto flex max-w-[880px] flex-col gap-5 px-4 sm:px-6">
      <LargeTitle title="Activity" subtitle="What the gateway has done since it last started, and the prompts you checked in this window." />

      <section aria-labelledby="server-heading" className="surface rounded-2xl p-5 sm:p-6">
        <h2 id="server-heading" className="text-[15px] font-semibold text-label-2">
          On This Gateway
        </h2>
        <p className="mt-1 text-[22px] font-bold leading-snug tracking-[-0.02em] text-label">
          <span className="tabular-nums">{total.toLocaleString()}</span> checked
          <span className="text-label-3"> · </span>
          <span className="tabular-nums">{protectedCount.toLocaleString()}</span> protected
          <span className="text-label-3"> · </span>
          <span className="tabular-nums">{data ? data.mean_latency_ms.toFixed(0) : "–"}</span>
          <span className="text-[17px] font-semibold text-label-2"> ms average</span>
        </p>

        <div className="fill mt-5 flex h-2.5 overflow-hidden rounded-full" aria-hidden="true">
          {total > 0
            ? ORDER.map((k) => (
                <span key={k} className={`h-full ${STATUS[k].fill} transition-[width] duration-500`} style={{ width: `${((d[k] ?? 0) / total) * 100}%` }} />
              ))
            : null}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4" aria-label="Results by type">
          {ORDER.map((k) => (
            <li key={k} className="flex items-center gap-2 text-[15px]">
              <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS[k].fill}`} aria-hidden="true" />
              <span className="font-semibold tabular-nums text-label">{(d[k] ?? 0).toLocaleString()}</span>
              <span className={STATUS[k].text}>{STATUS[k].word}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="history-heading" className="flex flex-col gap-2.5">
        <h2 id="history-heading" className="px-1 text-[15px] font-semibold text-label-2">
          Checked in This Window
        </h2>
        {history.length === 0 ? (
          <div className="surface flex flex-col items-start gap-3 rounded-2xl p-5">
            <p className="text-[15px] text-label-2">Nothing yet. Prompts you check appear here; the original text is never kept.</p>
            <Link href="/" className={`${buttonPrimary} ${focusRing}`}>
              Check a Prompt
            </Link>
          </div>
        ) : (
          <ul className="surface divide-y divide-[var(--separator)] overflow-hidden rounded-2xl">
            {history.map((h) => (
              <li key={h.id} className="flex flex-col gap-1.5 px-5 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusLabel decision={h.status === "COMPLETED" && h.decision === "REVIEW" ? "ALLOW" : h.decision} className="text-[15px]" />
                  <span className="text-[13px] text-label-2">
                    {h.source === "approval" ? "Approval · " : ""}
                    {h.provider ? `${providerLabel(h.provider)} · ` : ""}
                    {timeAgo(h.at)}
                  </span>
                </div>
                {h.sentText ? (
                  <p className="line-clamp-2 break-words font-mono text-[13px] leading-6 text-label">
                    <RedactedText text={h.sentText} />
                  </p>
                ) : (
                  <p className="text-[13px] text-label-2">{h.found.length ? `Found: ${h.found.join(", ")}. Nothing was sent.` : "Nothing was sent."}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
