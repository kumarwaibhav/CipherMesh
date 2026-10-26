import { Ban, CheckCircle2, Eye, ShieldAlert, UserCheck } from "lucide-react";
import type { ActionDecision, InspectResponse, RequestStatus } from "@/lib/api";
import { providerLabel } from "@/lib/api";
import { DECISION_STYLES, DecisionBadge, KeyValue } from "./ui";

const EXPLANATIONS: Record<ActionDecision, string> = {
  ALLOW: "No sensitive data found. The prompt was forwarded to the provider unchanged.",
  REDACT: "Sensitive values were masked. Only the sanitized text was forwarded to the provider.",
  REVIEW: "Held for human approval. Nothing has been sent to any provider yet.",
  BLOCK: "Nothing was sent. A secret or credential was detected — rotate that credential now.",
};

/** The outcome depends on where the request ended up (status), not only on the policy decision. */
export function explainOutcome(decision: ActionDecision, status: RequestStatus): string {
  switch (status) {
    case "DENIED":
      return "Denied by a reviewer. Nothing was sent.";
    case "NO_ROUTE":
      return "No feasible provider satisfied the routing constraints. Nothing was sent.";
    case "PROVIDER_FAILED":
      return "The selected provider did not return a response. No model output is available.";
    case "RESPONSE_BLOCKED":
      return "The model replied, but response-side inspection withheld the output because it contained sensitive data.";
    default:
      break;
  }
  if (decision === "REVIEW") {
    if (status === "COMPLETED") return "Approved by a reviewer and released to the local tier only.";
    if (status === "BLOCKED") return "Re-inspection blocked the release.";
    return EXPLANATIONS.REVIEW;
  }
  return EXPLANATIONS[decision] ?? EXPLANATIONS.REVIEW;
}

const ICONS: Record<ActionDecision, typeof CheckCircle2> = {
  ALLOW: CheckCircle2,
  REDACT: ShieldAlert,
  REVIEW: UserCheck,
  BLOCK: Ban,
};

export function DecisionCard({ result, source }: { result: InspectResponse | null; source: "inspect" | "review" | null }) {
  return (
    <div aria-live="polite" aria-atomic="true">
      {result ? <DecisionBody result={result} source={source} /> : null}
    </div>
  );
}

function DecisionBody({ result, source }: { result: InspectResponse; source: "inspect" | "review" | null }) {
  const decision = result.action_decision;
  const style = DECISION_STYLES[decision] ?? DECISION_STYLES.REVIEW;
  const Icon = ICONS[decision] ?? Eye;
  const total = result.timings_ms?.total_ms;
  const reasons = Array.isArray(result.reasons) ? result.reasons : [];

  return (
    <section
      aria-label={`Policy decision ${decision}`}
      className={`animate-fade-in rounded-xl border p-4 sm:p-5 ${style.card}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900/80 ${style.text}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <DecisionBadge decision={decision} size="lg" />
            <span className="rounded-md bg-zinc-900/80 px-2 py-0.5 font-mono text-xs text-zinc-200 ring-1 ring-inset ring-zinc-700">
              {result.status}
            </span>
            {source === "review" ? (
              <span className="rounded-md bg-zinc-900/80 px-2 py-0.5 text-xs text-zinc-300 ring-1 ring-inset ring-zinc-700">
                review outcome
              </span>
            ) : null}
          </div>
          <p className={`mt-2 text-sm font-medium ${style.text}`}>{explainOutcome(decision, result.status)}</p>
        </div>
      </div>

      {reasons.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {reasons.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm text-zinc-200">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
              <span className="min-w-0 break-words">{r}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-zinc-700/50 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <KeyValue label="Routed provider" value={providerLabel(result.routed_provider)} />
        <KeyValue label="Request ID" value={result.request_id} mono />
        <KeyValue label="Review ID" value={result.review_id ?? "—"} mono />
        <KeyValue
          label="Policy / latency"
          value={`v${result.policy_version}${typeof total === "number" ? ` · ${total.toFixed(2)} ms` : ""}`}
          mono
        />
      </dl>
    </section>
  );
}
