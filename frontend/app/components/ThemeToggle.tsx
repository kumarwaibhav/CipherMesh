"use client";

import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
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

/** App-wide: while the preference is Automatic, follow the operating system as it changes. */
export function useFollowSystemTheme() {
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readPreference() === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
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

/**
 * One control: the app starts in the device's appearance (dark when it can't tell), and this button
 * switches between Light and Dark. The choice is remembered on this device.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [pref, choose] = useThemePreference();
  const [dark, setDark] = useState(true);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, [pref]);
  const next = dark ? "light" : "dark";
  const label = dark ? "Switch to Light Appearance" : "Switch to Dark Appearance";
  return (
    <button
      type="button"
      onClick={() => {
        choose(next);
        setDark(!dark);
      }}
      aria-label={label}
      title={label}
      className={`group relative inline-flex h-11 w-11 items-center justify-center rounded-full text-label-2 transition-colors hover:bg-[var(--fill-2)] hover:text-label lg:h-9 lg:w-9 ${focusRing} ${className}`}
    >
      <Sun className={`absolute h-[18px] w-[18px] transition-all duration-500 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] ${dark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`} aria-hidden="true" />
      <Moon className={`absolute h-[18px] w-[18px] transition-all duration-500 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`} aria-hidden="true" />
    </button>
  );
}
