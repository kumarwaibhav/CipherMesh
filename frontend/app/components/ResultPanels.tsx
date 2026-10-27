import { Check, MessageSquare, X } from "lucide-react";
import type { Finding, ModelResponse, RouteResult, VaultInfo } from "@/lib/api";
import { providerLabel } from "@/lib/api";
import { categoryName, findingKind, KIND_LABEL } from "@/lib/friendly";
import { Collapsible } from "./Collapsible";
import { RedactedText } from "./RedactedText";
import { EmptyState, KeyValue, StatusLabel, focusRing } from "./ui";

const KIND_TEXT = { secret: "text-block-text", personal: "text-redact-text", internal: "text-review-text" } as const;

export function FindingsDetails({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) return <EmptyState>Nothing sensitive was detected.</EmptyState>;
  return (
    <div
      role="region"
      aria-label="Detector findings, scrolls horizontally"
      tabIndex={0}
      className={`scrollbar-thin overflow-x-auto rounded-2xl ${focusRing}`}
    >
      <table className="w-full min-w-[560px] text-left text-sm">
        <caption className="sr-only">Detector findings</caption>
        <thead>
          <tr className="sep border-b text-xs text-label-2">
            <th scope="col" className="py-2 pr-3 font-medium">What</th>
            <th scope="col" className="py-2 pr-3 font-medium">Type</th>
            <th scope="col" className="py-2 pr-3 font-medium">Rule</th>
            <th scope="col" className="py-2 pr-3 font-medium">Position</th>
            <th scope="col" className="py-2 pr-3 font-medium">Confidence</th>
            <th scope="col" className="py-2 font-medium">Method</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f, i) => {
            const kind = findingKind(f);
            return (
              <tr key={`${f.rule}-${f.start}-${i}`} className="sep border-b last:border-0">
                <td className="py-2.5 pr-3 font-medium text-label">{categoryName(f.category)}</td>
                <td className={`py-2.5 pr-3 font-semibold ${KIND_TEXT[kind]}`}>{KIND_LABEL[kind]}</td>
                <td className="py-2.5 pr-3 font-mono text-label-2">{f.rule}</td>
                <td className="py-2.5 pr-3 font-mono text-label-2">
                  {f.start}–{f.end}
                </td>
                <td className="py-2.5 pr-3 font-mono text-label-2">{(f.confidence * 100).toFixed(0)}%</td>
                <td className="py-2.5 text-label-2">{f.source}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UtilityBar({ value, selected }: { value: number; selected: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div
        className="fill h-1.5 w-20 overflow-hidden rounded-full"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Number(pct.toFixed(2))}
        aria-label="Score"
      >
        <div className={`h-full rounded-full ${selected ? "bg-accent" : "bg-label-3"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-label">{value.toFixed(1)}</span>
    </div>
  );
}

export function RoutingDetails({ route }: { route: RouteResult }) {
  const evaluations = [...route.evaluations].sort((a, b) => {
    if (a.provider_id === route.selected) return -1;
    if (b.provider_id === route.selected) return 1;
    if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
    return b.utility - a.utility;
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-label-2">
        {route.selected ? (
          <>
            CipherMesh negotiated a price with every model, ruled out any that break the privacy rules, then chose{" "}
            <span className="font-semibold text-label">{providerLabel(route.selected)}</span> for the best balance of quality, cost,
            speed and privacy.
          </>
        ) : (
          "No model met every rule, so nothing was sent."
        )}
      </p>
      {evaluations.length === 0 ? (
        <EmptyState>No models were evaluated.</EmptyState>
      ) : (
        <div
          role="region"
          aria-label="Model comparison, scrolls horizontally"
          tabIndex={0}
          className={`scrollbar-thin overflow-x-auto rounded-2xl ${focusRing}`}
        >
          <table className="w-full min-w-[600px] text-left text-sm">
            <caption className="sr-only">Model comparison</caption>
            <thead>
              <tr className="sep border-b text-xs text-label-2">
                <th scope="col" className="py-2 pr-3 font-medium">Model</th>
                <th scope="col" className="py-2 pr-3 font-medium">Allowed</th>
                <th scope="col" className="py-2 pr-3 font-medium">Score</th>
                <th scope="col" className="py-2 pr-3 font-medium">Price / 1K</th>
                <th scope="col" className="py-2 font-medium">Why not</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev) => {
                const selected = ev.provider_id === route.selected;
                return (
                  <tr key={ev.provider_id} className={`sep border-b last:border-0 ${selected ? "bg-accent/[0.06]" : ""}`} aria-current={selected ? "true" : undefined}>
                    <td className="py-2.5 pr-3">
                      <span className={`text-label ${selected ? "font-semibold" : ""}`}>{providerLabel(ev.provider_id)}</span>
                      {selected ? <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">Chosen</span> : null}
                    </td>
                    <td className="py-2.5 pr-3">
                      {ev.feasible ? (
                        <span className="inline-flex items-center gap-1 font-medium text-allow-text">
                          <Check className="h-4 w-4" aria-hidden="true" /> Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-block-text">
                          <X className="h-4 w-4" aria-hidden="true" /> No
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <UtilityBar value={ev.utility} selected={selected} />
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-label">${ev.effective_cost.toFixed(2)}</td>
                    <td className="py-2.5 font-mono text-xs text-label-2">{ev.reasons.length ? ev.reasons.join(", ") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {route.notes.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {route.notes.map((n, i) => (
            <li key={i} className="text-sm text-label-2">
              <span className="font-semibold text-accent-text">Note: </span>
              {n}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function VaultDetails({ vault }: { vault: VaultInfo | null }) {
  if (!vault) return <EmptyState>Your original text is sealed here after each check.</EmptyState>;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-label-2">
        Your original text was encrypted and locked away, so it can be audited later without anyone reading it in plain form.
      </p>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KeyValue label="Sealed token" value={vault.token_preview} mono className="sm:col-span-2" />
        <KeyValue label="Encryption" value={vault.cipher} />
        <KeyValue label="Key derivation" value={`${vault.kdf} · ${vault.iterations.toLocaleString()} rounds`} />
        <KeyValue label="Key ID" value={vault.key_id} mono />
        <KeyValue label="Sealed size" value={`${vault.sealed_bytes.toLocaleString()} bytes`} />
      </dl>
    </div>
  );
}

export function ReplyCard({ response }: { response: ModelResponse }) {
  return (
    <Collapsible
      title="AI Reply"
      icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
      meta={
        <span className="flex items-center gap-2">
          from {providerLabel(response.provider)} · reply checked
          <StatusLabel decision={response.decision} />
        </span>
      }
    >
      <div className="px-5 pb-5">
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-label">
          <RedactedText text={response.text} />
        </p>
        <p className="mt-3 text-[13px] text-label-2">This demo uses simulated cloud models, so replies are placeholders.</p>
      </div>
    </Collapsible>
  );
}
