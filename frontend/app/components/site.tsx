import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { focusRing } from "./ui";

/** Product-site building blocks: one section rhythm, one heading scale, used on every marketing page. */
export function SiteSection({
  id,
  kicker,
  title,
  lead,
  children,
  className = "",
  center = false,
}: {
  id?: string;
  kicker?: string;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  className?: string;
  center?: boolean;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={`mx-auto max-w-[1120px] scroll-mt-28 px-4 py-16 sm:px-6 sm:py-24 ${className}`}>
      <div className={center ? "mx-auto max-w-[760px] text-center" : "max-w-[760px]"}>
        {kicker ? <p className="text-[15px] font-semibold text-accent-text">{kicker}</p> : null}
        <h2 id={headingId} className="mt-2 text-balance text-[32px] font-bold leading-[1.1] tracking-[-0.025em] text-label sm:text-[44px]">
          {title}
        </h2>
        {lead ? <p className="mt-4 text-pretty text-[17px] leading-relaxed text-label-2 sm:text-[19px]">{lead}</p> : null}
      </div>
      {children ? <div className="mt-10 sm:mt-14">{children}</div> : null}
    </section>
  );
}

export function PageHero({ kicker, title, lead, children }: { kicker?: string; title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mx-auto max-w-[1120px] px-4 pb-6 pt-10 sm:px-6 sm:pt-16">
      {kicker ? <p className="text-[15px] font-semibold text-accent-text">{kicker}</p> : null}
      <h1 className="mt-2 max-w-[880px] text-balance text-[40px] font-bold leading-[1.05] tracking-[-0.03em] text-label sm:text-[56px]">{title}</h1>
      {lead ? <p className="mt-5 max-w-[720px] text-pretty text-[17px] leading-relaxed text-label-2 sm:text-[20px]">{lead}</p> : null}
      {children ? <div className="mt-8">{children}</div> : null}
    </header>
  );
}

export function TextLink({ href, children, external = false }: { href: string; children: ReactNode; external?: boolean }) {
  const cls = `inline-flex items-center gap-1 rounded text-[15px] font-semibold text-accent-text hover:underline ${focusRing}`;
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

export function Source({ name, url }: { name: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`rounded text-[12px] text-label-2 underline decoration-[rgb(var(--label)/0.25)] underline-offset-2 hover:text-label ${focusRing}`}>
      {name}
      <span className="sr-only"> (source, opens in a new tab)</span>
    </a>
  );
}

/** A code block that stays dark in both appearances, like a terminal. */
export function Code({ children, label }: { children: string; label?: string }) {
  return (
    <figure className="force-dark min-w-0 overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-white/10">
      {label ? <figcaption className="border-b border-white/10 px-4 py-2 font-mono text-[12px] text-zinc-400">{label}</figcaption> : null}
      <pre tabIndex={0} className={`scrollbar-thin overflow-x-auto p-4 font-mono text-[13px] leading-6 text-zinc-100 ${focusRing}`}>
        <code>{children}</code>
      </pre>
    </figure>
  );
}
