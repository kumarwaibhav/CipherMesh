"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronsUpDown, Cloud, Server, Sparkles } from "lucide-react";
import type { TargetProvider } from "@/lib/api";
import { focusRing } from "./ui";

const OPTIONS: ReadonlyArray<{ value: TargetProvider; label: string; detail: string; Icon: typeof Cloud }> = [
  { value: "auto", label: "Best Match", detail: "CipherMesh picks the safest, best-value model", Icon: Sparkles },
  { value: "aws-bedrock", label: "AWS Bedrock", detail: "Mumbai · data stays in India", Icon: Cloud },
  { value: "azure-ai", label: "Azure AI Foundry", detail: "Central India · data stays in India", Icon: Cloud },
  { value: "gcp-vertex", label: "GCP Vertex AI", detail: "Iowa, US · not for Indian personal data", Icon: Cloud },
  { value: "local", label: "Private Local Model", detail: "Runs inside your network", Icon: Server },
];

/**
 * A pop-up button (HIG: pop-up buttons) instead of a native select: a clear, readable trigger in both
 * appearances, and a menu that explains each choice. Arrow keys, Home/End, Enter and Escape work.
 */
export function ProviderPicker({ value, onChange, disabled }: { value: TargetProvider; onChange: (v: TargetProvider) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const labelId = useId();
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, OPTIONS.findIndex((o) => o.value === value)));
    requestAnimationFrame(() => listRef.current?.focus());
    const onDoc = (e: PointerEvent) => {
      if (!listRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open, value]);

  const choose = (i: number) => {
    onChange(OPTIONS[i].value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, OPTIONS.length - 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(OPTIONS.length - 1);
    else if (e.key === "Enter" || e.key === " ") choose(active);
    else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      if (e.key === "Escape") buttonRef.current?.focus();
      return;
    } else return;
    e.preventDefault();
  };

  return (
    <div className="relative min-w-0">
      <span id={labelId} className="sr-only">
        Send to
      </span>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${labelId}-v`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`inline-flex h-11 max-w-full items-center gap-2 rounded-full border border-[rgb(var(--label)/0.16)] bg-[rgb(var(--surface))] pl-3 pr-2.5 text-[14px] font-semibold text-label shadow-surface transition-colors hover:border-[rgb(var(--label)/0.28)] disabled:opacity-60 sm:h-9 ${focusRing}`}
      >
        <current.Icon className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
        <span id={`${labelId}-v`} className="truncate">
          {current.label}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-label-2" aria-hidden="true" />
      </button>
      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
          className="glass absolute bottom-full left-0 z-50 mb-2 w-[min(320px,calc(100vw-48px))] rounded-2xl p-1.5 [--glass-a:0.97] focus:outline-none"
        >
          {OPTIONS.map((o, i) => {
            const selected = o.value === value;
            return (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ${i === active ? "bg-[var(--fill)]" : ""}`}
              >
                <o.Icon className="mt-0.5 h-4 w-4 shrink-0 text-label-2" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-label">{o.label}</span>
                  <span className="block text-[13px] text-label-2">{o.detail}</span>
                </span>
                {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
