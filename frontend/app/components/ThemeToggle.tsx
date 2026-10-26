"use client";

import { useCallback, useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";
import { focusRing } from "./ui";

const THEME_EVENT = "ciphermesh:theme-changed";

function systemPrefersDark(): boolean {
  return typeof window.matchMedia !== "function" || window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readPreference(): ThemePreference {
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(pref: ThemePreference) {
  const root = document.documentElement;
  const dark = pref === "dark" || (pref === "system" && systemPrefersDark());
  root.classList.add("theme-switching");
  root.classList.toggle("dark", dark);
  // Two frames: let the new colours paint before transitions come back.
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
}

/** Shared theme preference; every control using it stays in sync. */
export function useThemePreference(): [ThemePreference | null, (next: ThemePreference) => void] {
  const [pref, setPref] = useState<ThemePreference | null>(null);

  useEffect(() => {
    setPref(readPreference());
    const onChange = () => setPref(readPreference());
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  // Follow the operating system while the preference is "system".
  useEffect(() => {
    if (pref !== "system" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const choose = useCallback((next: ThemePreference) => {
    try {
      if (next === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
      else window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* Storage blocked: the choice still applies for this page view. */
    }
    apply(next);
    setPref(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return [pref, choose];
}

export const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; short: string; Icon: typeof Sun }> = [
  { value: "light", label: "Light appearance", short: "Light", Icon: Sun },
  { value: "dark", label: "Dark appearance", short: "Dark", Icon: Moon },
  { value: "system", label: "Match my device", short: "Auto", Icon: Monitor },
];

export function ThemeToggle({ withLabels = false, className = "" }: { withLabels?: boolean; className?: string }) {
  const [pref, choose] = useThemePreference();
  return (
    <div role="group" aria-label="Appearance" className={`well flex items-center gap-0.5 rounded-full p-0.5 ${className}`}>
      {THEME_OPTIONS.map(({ value, label, short, Icon }) => {
        const active = pref === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            aria-pressed={active}
            aria-label={withLabels ? undefined : label}
            title={label}
            className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition ${focusRing} ${
              withLabels ? "flex-1 px-3" : "w-9"
            } ${active ? "glass-strong text-label" : "text-label-2 hover:text-label"}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {withLabels ? short : null}
          </button>
        );
      })}
    </div>
  );
}
