"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { Check, Copy } from "lucide-react";
import { focusRing } from "./ui";

/** Language tabs over one dark code surface, with copy. Arrow keys move between languages. */
export function CodeTabs({ samples, label }: { samples: ReadonlyArray<{ lang: string; code: string }>; label: string }) {
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + samples.length) % samples.length;
    setI(j);
    document.getElementById(`${id}-t${j}`)?.focus();
  };

  return (
    <div className="force-dark min-w-0 overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pl-2 pr-1">
        <div role="tablist" aria-label={label} className="flex">
          {samples.map((s, j) => (
            <button
              key={s.lang}
              id={`${id}-t${j}`}
              role="tab"
              type="button"
              aria-selected={i === j}
              aria-controls={`${id}-p`}
              tabIndex={i === j ? 0 : -1}
              onKeyDown={onKey}
              onClick={() => setI(j)}
              className={`relative min-h-[40px] px-3 font-mono text-[12px] ${focusRing} ${i === j ? "text-zinc-50" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {s.lang}
              {i === j ? <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-sky-400" /> : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(samples[i].code);
              setCopied(true);
            } catch {
              /* clipboard unavailable */
            }
          }}
          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 font-mono text-[12px] text-zinc-300 hover:bg-white/10 ${focusRing}`}
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre id={`${id}-p`} role="tabpanel" aria-labelledby={`${id}-t${i}`} tabIndex={0} className={`scrollbar-thin overflow-x-auto p-4 font-mono text-[13px] leading-6 text-zinc-100 ${focusRing}`}>
        <code>{samples[i].code}</code>
      </pre>
    </div>
  );
}

/** Sticky table of contents that follows the reader: the visible section is marked current. */
export function DocsToc({ items }: { items: ReadonlyArray<{ id: string; label: string; sub?: boolean }> }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((x): x is HTMLElement => Boolean(x));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav aria-label="On this page" className="hidden lg:block">
      <ul className="sticky top-28 flex flex-col gap-0.5 border-l border-[var(--separator)]">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? "location" : undefined}
              className={`-ml-px block border-l-2 py-1.5 text-[13px] transition-colors ${i.sub ? "pl-6" : "pl-4"} ${focusRing} ${
                active === i.id ? "border-accent font-semibold text-label" : "border-transparent text-label-2 hover:text-label"
              }`}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
