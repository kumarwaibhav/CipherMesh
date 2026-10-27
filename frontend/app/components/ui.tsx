import type { ReactNode } from "react";
import { AlertTriangle, Ban, CheckCircle2, Clock, EyeOff, X } from "lucide-react";
import type { ActionDecision, ResponseDecision } from "@/lib/api";

export type AnyDecision = ActionDecision | ResponseDecision;

/**
 * Status colour lives only on the glyph and the status word (Apple colour psychology:
 * green done, orange changed, indigo waiting on a person, red stopped). Text stays in label colours.
 */
export const STATUS: Record<AnyDecision, { word: string; text: string; fill: string; Icon: typeof CheckCircle2 }> = {
  ALLOW: { word: "Safe", text: "text-allow-text", fill: "bg-allow", Icon: CheckCircle2 },
  REDACT: { word: "Cleaned", text: "text-redact-text", fill: "bg-redact", Icon: EyeOff },
  REVIEW: { word: "Waiting", text: "text-review-text", fill: "bg-review", Icon: Clock },
  BLOCK: { word: "Blocked", text: "text-block-text", fill: "bg-block", Icon: Ban },
};

function isDecision(value: string): value is AnyDecision {
  return value in STATUS;
}

/** A quiet status label: coloured dot + word, never a filled chip. */
export function StatusLabel({ decision, className = "" }: { decision: string; className?: string }) {
  if (!isDecision(decision)) return <span className={`text-label-2 ${className}`}>{decision}</span>;
  const s = STATUS[decision];
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${s.text} ${className}`}>
      <span className={`h-2 w-2 rounded-full ${s.fill}`} aria-hidden="true" />
      {s.word}
    </span>
  );
}

/** Solid content-layer surface. Glass is reserved for the functional layer (bars, sheets). */
export function Section({
  title,
  description,
  actions,
  children,
  className = "",
  bodyClassName = "p-5",
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={title ? headingId : undefined} className={`surface min-w-0 rounded-2xl ${className}`}>
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-2 px-5 pt-4">
          <div className="min-w-0">
            <h2 id={headingId} className="text-[17px] font-semibold tracking-[-0.01em] text-label">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-[13px] text-label-2">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Kept for components that still import the old name. */
export const Card = Section;

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div role="alert" className="surface flex items-start gap-3 rounded-2xl px-4 py-3 text-[15px] text-label">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-block-text" aria-hidden="true" />
      <p className="min-w-0 flex-1 break-words">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className={`-m-1.5 inline-flex h-11 w-11 items-center justify-center rounded-full text-label-2 hover:bg-[var(--fill)] ${focusRing}`}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="fill-2 rounded-xl px-4 py-6 text-center text-[15px] text-label-2">{children}</p>;
}

export function KeyValue({ label, value, mono = false, className = "" }: { label: string; value: ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-[13px] text-label-2">{label}</dt>
      <dd className={`mt-0.5 break-all text-[15px] text-label ${mono ? "font-mono text-[13px]" : ""}`}>{value}</dd>
    </div>
  );
}

export const focusRing =
  "focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text";

export const inputBase =
  "fill min-h-[44px] w-full rounded-[10px] border border-[rgb(var(--label)/0.14)] px-3.5 py-2.5 text-[15px] text-label placeholder:text-label-3 transition focus:bg-[rgb(var(--surface))] focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-accent-text disabled:opacity-60";

/** One filled (prominent) button per view. */
export const buttonPrimary =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-accent px-5 text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-accent-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-[var(--fill)] disabled:text-label-2";

/** Tinted (bordered) secondary button. */
export const buttonSecondary =
  "fill inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-[15px] font-semibold text-label transition-[background-color,transform] duration-150 hover:bg-[var(--fill)] active:scale-[0.97] disabled:opacity-50";

/** Plain text button in the accent colour. */
export const buttonPlain =
  "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-3 text-[15px] font-semibold text-accent-text transition hover:bg-accent/10 active:scale-[0.97]";

/** Small icon button for bars (44 px hit target on phones, 32 px visual). */
export const iconButton =
  "inline-flex h-11 w-11 items-center justify-center rounded-full text-label-2 transition hover:bg-[var(--fill)] hover:text-label active:scale-95 lg:h-9 lg:w-9";

/** Smooth scrolling unless the person asked for reduced motion. */
export function smooth(): ScrollBehavior {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
