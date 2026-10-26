import type { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { ActionDecision, ResponseDecision } from "@/lib/api";

export type AnyDecision = ActionDecision | ResponseDecision;

/**
 * Apple colour psychology: green = done/safe, orange = changed/caution, indigo = waiting on a person,
 * red = stopped. Each decision keeps its word next to the colour, so it never relies on colour alone.
 */
export const DECISION_STYLES: Record<
  AnyDecision,
  { badge: string; card: string; text: string; dot: string; icon: string }
> = {
  ALLOW: {
    badge: "bg-allow/15 text-allow-text",
    card: "bg-allow/[0.08] border-allow/30",
    text: "text-allow-text",
    dot: "bg-allow",
    icon: "bg-allow text-white",
  },
  REDACT: {
    badge: "bg-redact/15 text-redact-text",
    card: "bg-redact/[0.08] border-redact/30",
    text: "text-redact-text",
    dot: "bg-redact",
    icon: "bg-redact text-white",
  },
  REVIEW: {
    badge: "bg-review/15 text-review-text",
    card: "bg-review/[0.08] border-review/30",
    text: "text-review-text",
    dot: "bg-review",
    icon: "bg-review text-white",
  },
  BLOCK: {
    badge: "bg-block/15 text-block-text",
    card: "bg-block/[0.08] border-block/30",
    text: "text-block-text",
    dot: "bg-block",
    icon: "bg-block text-white",
  },
};

export const DECISION_WORDS: Record<AnyDecision, string> = {
  ALLOW: "Safe",
  REDACT: "Cleaned",
  REVIEW: "Waiting",
  BLOCK: "Blocked",
};

function isDecision(value: string): value is AnyDecision {
  return value in DECISION_STYLES;
}

export function DecisionBadge({ decision, size = "md" }: { decision: string; size?: "sm" | "md" | "lg" }) {
  const style = isDecision(decision) ? DECISION_STYLES[decision].badge : "well text-label-2";
  const sizing = size === "lg" ? "px-3 py-1 text-sm" : size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${style} ${sizing}`}>
      {isDecision(decision) ? <span className={`h-1.5 w-1.5 rounded-full ${DECISION_STYLES[decision].dot}`} aria-hidden="true" /> : null}
      {isDecision(decision) ? DECISION_WORDS[decision] : decision}
      <span className="sr-only"> ({decision})</span>
    </span>
  );
}

export function Card({
  title,
  icon,
  actions,
  children,
  className = "",
  bodyClassName = "p-5",
  id,
  description,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
  description?: ReactNode;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={title ? headingId : undefined} className={`glass min-w-0 rounded-3xl ${className}`}>
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-2 px-5 pt-5">
          <div className="min-w-0">
            <h2 id={headingId} className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-label">
              {icon ? (
                <span className="text-label-2" aria-hidden="true">
                  {icon}
                </span>
              ) : null}
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-sm text-label-2">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div role="alert" className="glass flex items-start gap-3 rounded-2xl border-block/30 px-4 py-3 text-sm text-block-text">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 break-words font-medium">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className={`rounded-full p-1 hover:bg-block/10 ${focusRing}`}
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="well rounded-2xl px-4 py-6 text-center text-sm text-label-2">{children}</p>;
}

export function KeyValue({
  label,
  value,
  mono = false,
  className = "",
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-xs font-medium text-label-2">{label}</dt>
      <dd className={`mt-0.5 break-all text-[15px] text-label ${mono ? "font-mono text-sm" : ""}`}>{value}</dd>
    </div>
  );
}

export const focusRing =
  "focus:outline-none focus-visible:ring-4 focus-visible:ring-tint/40 focus-visible:ring-offset-0";

export const inputBase =
  "well w-full rounded-xl border border-transparent px-3.5 py-2.5 text-[15px] text-label placeholder:text-label-3 transition focus:border-tint/60 focus:outline-none focus:ring-4 focus:ring-tint/20 disabled:opacity-60";

export const buttonPrimary =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-tint px-6 text-[15px] font-semibold text-white shadow-[0_6px_20px_-6px_rgb(0_113_227/0.6)] transition hover:bg-tint-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-label-3/30 disabled:text-label-2 disabled:shadow-none";

export const buttonSecondary =
  "glass-thin inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-label transition hover:bg-[rgb(var(--glass)/0.7)] active:scale-[0.98]";

export const buttonPlain =
  "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-tint-text transition hover:bg-tint/10";
