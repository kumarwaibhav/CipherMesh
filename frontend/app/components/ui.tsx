import type { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { ActionDecision, ResponseDecision } from "@/lib/api";

export type AnyDecision = ActionDecision | ResponseDecision;

export const DECISION_STYLES: Record<
  AnyDecision,
  { badge: string; card: string; text: string; dot: string; bar: string }
> = {
  ALLOW: {
    badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40",
    card: "border-emerald-500/40 bg-emerald-950/70 dark:bg-emerald-500/[0.07]",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
    bar: "bg-emerald-500",
  },
  REDACT: {
    badge: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
    card: "border-amber-500/40 bg-amber-950/70 dark:bg-amber-500/[0.07]",
    text: "text-amber-300",
    dot: "bg-amber-400",
    bar: "bg-amber-500",
  },
  REVIEW: {
    badge: "bg-sky-500/15 text-sky-300 ring-sky-500/40",
    card: "border-sky-500/40 bg-sky-950/70 dark:bg-sky-500/[0.07]",
    text: "text-sky-300",
    dot: "bg-sky-400",
    bar: "bg-sky-500",
  },
  BLOCK: {
    badge: "bg-red-500/15 text-red-300 ring-red-500/40",
    card: "border-red-500/50 bg-red-950/70 dark:bg-red-500/[0.07]",
    text: "text-red-300",
    dot: "bg-red-500",
    bar: "bg-red-500",
  },
};

function isDecision(value: string): value is AnyDecision {
  return value in DECISION_STYLES;
}

export function DecisionBadge({ decision, size = "md" }: { decision: string; size?: "sm" | "md" | "lg" }) {
  const style = isDecision(decision)
    ? DECISION_STYLES[decision].badge
    : "bg-zinc-800 text-zinc-300 ring-zinc-700";
  const sizing =
    size === "lg"
      ? "px-3 py-1 text-sm"
      : size === "sm"
        ? "px-1.5 py-0.5 text-[10px]"
        : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-mono font-bold uppercase tracking-wider ring-1 ring-inset ${style} ${sizing}`}
    >
      {decision}
    </span>
  );
}

export function Card({
  title,
  icon,
  actions,
  children,
  className = "",
  bodyClassName = "p-4",
  id,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={`min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-card ${className}`}
    >
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-4 py-3 sm:px-5">
          <h2 id={headingId} className="flex items-center gap-2 text-sm font-semibold tracking-wide text-zinc-100">
            {icon ? <span className="text-zinc-400" aria-hidden="true">{icon}</span> : null}
            {title}
          </h2>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-200"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
      <p className="min-w-0 flex-1 break-words">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded p-0.5 text-red-300 hover:bg-red-500/15 hover:text-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-400">
      {children}
    </p>
  );
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
      <dt className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">{label}</dt>
      <dd className={`mt-0.5 break-all text-sm text-zinc-100 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

export const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export const inputBase =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors hover:border-zinc-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60";
