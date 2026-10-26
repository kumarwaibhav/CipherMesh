"use client";

import { useCallback, useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";
import { focusRing } from "./ui";

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

const OPTIONS: Array<{ value: ThemePreference; label: string; Icon: typeof Sun }> = [
  { value: "light", label: "Light theme", Icon: Sun },
  { value: "dark", label: "Dark theme", Icon: Moon },
  { value: "system", label: "Match system theme", Icon: Monitor },
];

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference | null>(null);

  useEffect(() => {
    setPref(readPreference());
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
    setPref(next);
    try {
      if (next === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
      else window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* Storage blocked: the choice still applies for this page view. */
    }
    apply(next);
  }, []);

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900 p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = pref === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={`inline-flex h-7 w-8 items-center justify-center rounded-md transition-colors ${focusRing} ${
              active ? "bg-zinc-800 text-zinc-50 shadow-card" : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
