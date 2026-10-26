import { Check, Eye, FileSearch, KeyRound, MessageSquare, Route as RouteIcon, Star, X } from "lucide-react";
import type { Finding, InspectResponse, ModelResponse, RouteResult, VaultInfo } from "@/lib/api";
import { providerLabel } from "@/lib/api";
import { RedactedText } from "./RedactedText";
import { Card, DecisionBadge, EmptyState, KeyValue, focusRing } from "./ui";

export function ProviderSeesPanel({ result }: { result: InspectResponse }) {
  return (
    <Card title="What the provider sees" icon={<Eye className="h-4 w-4" />} id="provider-sees">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Transmitted prompt
          </h3>
          {result.processed_prompt === null ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/[0.07] px-3 py-2.5 text-sm font-medium text-red-300">
              Nothing transmitted
            </p>
          ) : (
            <p className="whitespace-pre-wrap break-words rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-sm leading-relaxed text-zinc-100">
              <RedactedText text={result.processed_prompt} />
            </p>
          )}
        </div>
        <div>
          <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Safe preview</h3>
          {!result.safe_preview ? (
            <p className="text-sm text-zinc-400">
              {result.action_decision === "BLOCK"
                ? "Not shown: blocked prompts are never previewed."
                : "No preview available."}
            </p>
          ) : (
            <p className="whitespace-pre-wrap break-words rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 font-mono text-sm leading-relaxed text-zinc-300">
              <RedactedText text={result.safe_preview} />
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

const SEVERITY_STYLE: Record<string, string> = {
  SECRET: "bg-red-500/15 text-red-300 ring-red-500/40",
  CRITICAL: "bg-red-500/15 text-red-300 ring-red-500/40",
  HIGH: "bg-red-500/15 text-red-300 ring-red-500/40",
  SENSITIVE: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
  MEDIUM: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
  INTERNAL: "bg-sky-500/15 text-sky-300 ring-sky-500/40",
  LOW: "bg-zinc-700/40 text-zinc-300 ring-zinc-600",
};

export function FindingsTable({ findings }: { findings: Finding[] }) {
  return (
    <Card
      title="Findings"
      icon={<FileSearch className="h-4 w-4" />}
      id="findings"
      actions={<span className="text-xs text-zinc-400">{findings.length} detected</span>}
    >
      {findings.length === 0 ? (
        <EmptyState>No sensitive data detected in this prompt.</EmptyState>
      ) : (
        <div
          role="region"
          aria-label="Detector findings table, scrolls horizontally"
          tabIndex={0}
          className={`scrollbar-thin -mx-4 overflow-x-auto rounded px-4 ${focusRing}`}
        >
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Detector findings</caption>
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-400">
                <th scope="col" className="py-2 pr-3 font-medium">Rule</th>
                <th scope="col" className="py-2 pr-3 font-medium">Category</th>
                <th scope="col" className="py-2 pr-3 font-medium">Severity</th>
                <th scope="col" className="py-2 pr-3 font-medium">Span</th>
                <th scope="col" className="py-2 pr-3 font-medium">Confidence</th>
                <th scope="col" className="py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f, i) => (
                <tr key={`${f.rule}-${f.start}-${i}`} className="border-b border-zinc-800/60 last:border-0">
                  <td className="py-2 pr-3 font-mono text-zinc-200">{f.rule}</td>
                  <td className="py-2 pr-3 text-zinc-100">{f.category}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                        SEVERITY_STYLE[f.severity.toUpperCase()] ?? "bg-zinc-800 text-zinc-300 ring-zinc-700"
                      }`}
                    >
                      {f.severity}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-zinc-300">
                    [{f.start}:{f.end}]
                  </td>
                  <td className="py-2 pr-3 font-mono text-zinc-300">{(f.confidence * 100).toFixed(0)}%</td>
                  <td className="py-2 text-zinc-300">{f.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function UtilityBar({ value, selected }: { value: number; selected: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-800"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Number(pct.toFixed(2))}
        aria-label="Utility score"
      >
        <div
          className={`h-full rounded-full ${selected ? "bg-red-500" : "bg-zinc-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-zinc-200">{value.toFixed(2)}</span>
    </div>
  );
}

export function RoutePanel({ route }: { route: RouteResult }) {
  const evaluations = [...route.evaluations].sort((a, b) => {
    if (a.provider_id === route.selected) return -1;
    if (b.provider_id === route.selected) return 1;
    if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
    return b.utility - a.utility;
  });

  return (
    <Card
      title="Utility routing"
      icon={<RouteIcon className="h-4 w-4" />}
      id="route"
      actions={
        <span
          className={`rounded px-1.5 py-0.5 font-mono text-[11px] ring-1 ring-inset ${
            route.status === "SELECTED"
              ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
              : "bg-red-500/10 text-red-300 ring-red-500/30"
          }`}
        >
          {route.status}
        </span>
      }
    >
      {route.selected ? (
        <p className="mb-3 text-sm text-zinc-300">
          Selected <span className="font-semibold text-zinc-50">{providerLabel(route.selected)}</span>
          {typeof route.utility === "number" ? (
            <>
              {" "}with utility <span className="font-mono text-zinc-50">{route.utility.toFixed(2)}</span>
            </>
          ) : null}
          .
        </p>
      ) : null}
      {evaluations.length === 0 ? (
        <EmptyState>No provider evaluations returned.</EmptyState>
      ) : (
        <div
          role="region"
          aria-label="Provider evaluations table, scrolls horizontally"
          tabIndex={0}
          className={`scrollbar-thin -mx-4 overflow-x-auto rounded px-4 ${focusRing}`}
        >
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Provider evaluations</caption>
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-400">
                <th scope="col" className="py-2 pr-3 font-medium">Provider</th>
                <th scope="col" className="py-2 pr-3 font-medium">Feasible</th>
                <th scope="col" className="py-2 pr-3 font-medium">Utility</th>
                <th scope="col" className="py-2 pr-3 font-medium">$/1k</th>
                <th scope="col" className="py-2 pr-3 font-medium">Priced by</th>
                <th scope="col" className="py-2 font-medium">Reasons</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev) => {
                const selected = ev.provider_id === route.selected;
                return (
                  <tr
                    key={ev.provider_id}
                    className={`border-b border-zinc-800/60 last:border-0 ${selected ? "bg-brand/[0.06]" : ""}`}
                    aria-current={selected ? "true" : undefined}
                  >
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-1.5 text-zinc-100">
                        {selected ? <Star className="h-3.5 w-3.5 fill-red-500 text-red-500" aria-hidden="true" /> : null}
                        <span className={selected ? "font-semibold" : undefined}>{providerLabel(ev.provider_id)}</span>
                        {selected ? <span className="sr-only">(selected)</span> : null}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {ev.feasible ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300">
                          <Check className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Feasible</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-300">
                          <X className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Not feasible</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <UtilityBar value={ev.utility} selected={selected} />
                    </td>
                    <td className="py-2 pr-3 font-mono text-zinc-200">${ev.effective_cost.toFixed(2)}</td>
                    <td className="py-2 pr-3 text-xs text-zinc-300">{ev.priced_by}</td>
                    <td className="py-2 text-xs text-zinc-300">
                      {ev.reasons.length ? (
                        <ul className="space-y-0.5">
                          {ev.reasons.map((r, i) => (
                            <li key={i} className="break-words font-mono">{r}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {route.notes.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-zinc-800 pt-3">
          {route.notes.map((n, i) => (
            <li key={i} className="text-xs text-sky-200">
              <span className="mr-1 font-semibold text-sky-300">Note:</span>
              {n}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

export function ResponsePanel({ response }: { response: ModelResponse }) {
  return (
    <Card
      title="Model response"
      icon={<MessageSquare className="h-4 w-4" />}
      id="model-response"
      actions={<DecisionBadge decision={response.decision} size="sm" />}
    >
      <p className="mb-2 text-xs text-zinc-400">
        From <span className="text-zinc-200">{providerLabel(response.provider)}</span>, after response-side inspection
        {response.categories.length ? (
          <>
            {" "}· flagged: <span className="font-mono text-amber-200">{response.categories.join(", ")}</span>
          </>
        ) : null}
      </p>
      <p className="whitespace-pre-wrap break-words rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm leading-relaxed text-zinc-100">
        <RedactedText text={response.text} />
      </p>
    </Card>
  );
}

export function VaultPanel({ vault }: { vault: VaultInfo | null }) {
  return (
    <Card title="Vault isolation" icon={<KeyRound className="h-4 w-4" />} id="vault">
      {vault ? (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <KeyValue
            label="Token preview"
            value={vault.token_preview}
            mono
            className="sm:col-span-2 lg:col-span-1 xl:col-span-2"
          />
          <KeyValue label="KDF" value={vault.kdf} />
          <KeyValue label="Iterations" value={vault.iterations.toLocaleString()} mono />
          <KeyValue label="Cipher" value={vault.cipher} className="sm:col-span-2 lg:col-span-1 xl:col-span-2" />
          <KeyValue label="Key ID" value={vault.key_id} mono />
          <KeyValue label="Sealed bytes" value={vault.sealed_bytes.toLocaleString()} mono />
        </dl>
      ) : (
        <EmptyState>The original prompt is sealed here after each run.</EmptyState>
      )}
    </Card>
  );
}
