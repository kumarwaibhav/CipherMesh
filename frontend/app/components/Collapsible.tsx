"use client";

import { useId, useState, type ReactNode } from "react";
import { LogoMark } from "./Logo";
import { focusRing } from "./ui";

/**
 * A card whose body folds away. The CipherMesh mark in the header makes one full turn each time the
 * card opens or closes (a spring, ~0.7 s), and settles upright; Reduce Motion skips the turn.
 */
export function Collapsible({
  title,
  meta,
  icon,
  defaultOpen = true,
  children,
  className = "",
  id,
}: {
  title: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [turns, setTurns] = useState(0);
  const bodyId = useId();
  const headId = useId();

  return (
    <section id={id} aria-labelledby={headId} className={`surface min-w-0 rounded-2xl ${className}`}>
      <h2 className="m-0">
        <button
          type="button"
          id={headId}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => {
            setOpen((o) => !o);
            setTurns((t) => t + 1);
          }}
          className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-5 py-3 text-left ${focusRing}`}
        >
          {icon ? <span className="shrink-0 text-label-2">{icon}</span> : null}
          <span className="min-w-0 flex-1 text-[17px] font-semibold tracking-[-0.01em] text-label">{title}</span>
          {meta ? <span className="hidden shrink-0 text-[13px] font-normal text-label-2 sm:inline">{meta}</span> : null}
          <span
            className={`fold-mark inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${open ? "text-accent-text" : "text-label-2"}`}
            style={{ transform: `rotate(${turns * 360}deg) scale(${open ? 1 : 0.86})` }}
            aria-hidden="true"
          >
            <LogoMark simple className="h-[22px] w-[22px]" />
          </span>
        </button>
      </h2>
      <div className="fold" data-open={open}>
        <div
          id={bodyId}
          role="region"
          aria-labelledby={headId}
          ref={(el) => {
            if (el) el.toggleAttribute("inert", !open);
          }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
