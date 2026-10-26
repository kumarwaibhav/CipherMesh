"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { BookOpen, Check, CircleHelp, Inbox, KeyRound, Search, Settings, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import {
  API_BASE_URL,
  OPEN_SETTINGS_EVENT,
  api,
  readReviewerToken,
  readToken,
  writeReviewerToken,
  writeToken,
} from "@/lib/api";
import { PENDING_EXAMPLE_KEY, RUN_EXAMPLE_EVENT } from "@/lib/samples";
import { LogoMark } from "./Logo";
import { Sheet } from "./Sheet";
import { ThemeToggle } from "./ThemeToggle";
import { buttonPrimary, buttonSecondary, focusRing, inputBase } from "./ui";
import { POLL_INTERVAL_MS, usePolling } from "./usePolling";

export const OPEN_HELP_EVENT = "ciphermesh:open-help";

const NAV = [
  { href: "/", label: "Check", Icon: Search },
  { href: "/approvals", label: "Approvals", Icon: Inbox },
  { href: "/architecture", label: "How it works", Icon: BookOpen },
] as const;

function usePendingCount(): number | null {
  const fetchMetrics = useCallback((signal: AbortSignal) => api.metrics(signal), []);
  const { data } = usePolling(fetchMetrics, POLL_INTERVAL_MS);
  return typeof data?.pending_reviews === "number" ? data.pending_reviews : null;
}

function StatusDot() {
  const fetchHealth = useCallback((signal: AbortSignal) => api.health(signal), []);
  const { data, error, loading } = usePolling(fetchHealth, 60_000);
  const online = !error && data?.status === "ok";
  const checking = loading && !data && !error;
  const label = checking ? "Connecting" : online ? "Online" : "Offline";
  const title = online && data ? `Protection service v${data.version} · ${data.mode} mode` : error ?? `Checking ${API_BASE_URL}`;
  return (
    <span role="status" aria-live="polite" title={title} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-label-2">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {online ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-allow opacity-50" /> : null}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${checking ? "bg-label-3" : online ? "bg-allow" : "bg-block"}`} />
      </span>
      <span className="hidden md:inline">{label}</span>
      <span className="sr-only md:hidden">{label}</span>
    </span>
  );
}

function Badge({ count }: { count: number | null }) {
  if (!count) return null;
  return (
    <span className="ml-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-[#D70015] px-1.5 text-[11px] font-bold leading-5 text-white">
      {count > 99 ? "99+" : count}
      <span className="sr-only"> waiting</span>
    </span>
  );
}

function SettingsBody({ focus, onDone }: { focus: "api" | "reviewer"; onDone: () => void }) {
  const apiId = useId();
  const reviewerId = useId();
  const [apiToken, setApiToken] = useState("");
  const [reviewerToken, setReviewerToken] = useState("");
  const [saved, setSaved] = useState<"idle" | "saved" | "failed">("idle");
  const apiRef = useRef<HTMLInputElement>(null);
  const reviewerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setApiToken(readToken());
    setReviewerToken(readReviewerToken());
    (focus === "reviewer" ? reviewerRef : apiRef).current?.focus();
  }, [focus]);

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        const ok = writeToken(apiToken) && writeReviewerToken(reviewerToken);
        setSaved(ok ? "saved" : "failed");
        if (ok) window.setTimeout(onDone, 500);
      }}
    >
      <section className="flex flex-col gap-2">
        <h3 className="text-[15px] font-semibold">Appearance</h3>
        <ThemeToggle withLabels />
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-[15px] font-semibold">Access keys</h3>
          <p className="mt-0.5 text-sm text-label-2">Only needed if your administrator gave you one. Saved in this browser only.</p>
        </div>
        <div>
          <label htmlFor={reviewerId} className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-label">
            <UserCheck className="h-4 w-4 text-label-2" aria-hidden="true" />
            Reviewer key
          </label>
          <input
            id={reviewerId}
            ref={reviewerRef}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={reviewerToken}
            onChange={(e) => {
              setReviewerToken(e.target.value);
              setSaved("idle");
            }}
            placeholder="Lets you approve or deny held prompts"
            className={`${inputBase} font-mono`}
          />
        </div>
        <div>
          <label htmlFor={apiId} className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-label">
            <KeyRound className="h-4 w-4 text-label-2" aria-hidden="true" />
            API key
          </label>
          <input
            id={apiId}
            ref={apiRef}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiToken}
            onChange={(e) => {
              setApiToken(e.target.value);
              setSaved("idle");
            }}
            placeholder="Leave empty unless your server requires one"
            className={`${inputBase} font-mono`}
          />
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <span role="status" aria-live="polite" className="text-sm font-medium">
          {saved === "saved" ? (
            <span className="inline-flex items-center gap-1 text-allow-text">
              <Check className="h-4 w-4" aria-hidden="true" /> Saved
            </span>
          ) : saved === "failed" ? (
            <span className="text-block-text">This browser blocked saving</span>
          ) : null}
        </span>
        <button type="button" onClick={onDone} className={`${buttonSecondary} ${focusRing}`}>
          Cancel
        </button>
        <button type="submit" className={`${buttonPrimary} ${focusRing}`}>
          Save
        </button>
      </div>
    </form>
  );
}

const HELP_STEPS = [
  {
    Icon: Sparkles,
    title: "Paste what you plan to send to AI",
    text: "Or tap one of the examples. You don’t need to know anything about security.",
  },
  {
    Icon: ShieldCheck,
    title: "Press Check prompt",
    text: "CipherMesh looks for passwords, keys, personal details and internal links in under a second.",
  },
  {
    Icon: Check,
    title: "Read the coloured result",
    text: "Green is safe. Orange means private parts were hidden. Purple waits for a person. Red was stopped.",
  },
] as const;

function HelpBody({ onTry, onDone }: { onTry: () => void; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col gap-4">
        {HELP_STEPS.map(({ Icon, title, text }, i) => (
          <li key={title} className="flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-tint text-white shadow-[0_6px_16px_-6px_rgb(0_113_227/0.7)]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold">
                <span className="sr-only">Step {i + 1}: </span>
                {title}
              </p>
              <p className="mt-0.5 text-sm text-label-2">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="well rounded-2xl px-4 py-3 text-sm text-label-2">
        Some prompts need a person to approve them. They wait in <span className="font-semibold text-label">Approvals</span>. If
        approved, they only go to a private model that runs inside your company.
      </p>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onDone} className={`${buttonSecondary} ${focusRing}`}>
          Got it
        </button>
        <button type="button" onClick={onTry} className={`${buttonPrimary} ${focusRing}`}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Show me an example
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pending = usePendingCount();
  const [settings, setSettings] = useState<{ open: boolean; focus: "api" | "reviewer" }>({ open: false, focus: "api" });
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onSettings = (e: Event) => {
      const detail = (e as CustomEvent<{ focus?: "api" | "reviewer" }>).detail;
      setSettings({ open: true, focus: detail?.focus === "reviewer" ? "reviewer" : "api" });
    };
    const onHelp = () => setHelp(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, onSettings);
    window.addEventListener(OPEN_HELP_EVENT, onHelp);
    return () => {
      window.removeEventListener(OPEN_SETTINGS_EVENT, onSettings);
      window.removeEventListener(OPEN_HELP_EVENT, onHelp);
    };
  }, []);

  const tryExample = () => {
    setHelp(false);
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent(RUN_EXAMPLE_EVENT, { detail: { id: "india" } }));
    } else {
      try {
        window.sessionStorage.setItem(PENDING_EXAMPLE_KEY, "india");
      } catch {
        /* ignore */
      }
      router.push("/");
    }
  };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <div className="wallpaper" aria-hidden="true" />
      <a
        href="#main"
        className="glass-strong sr-only z-50 rounded-full px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
        <div className="glass-strong mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 rounded-full pl-3 pr-2 sm:pl-4">
          <Link href="/" aria-label="CipherMesh home" className={`flex min-w-0 items-center gap-2.5 rounded-full ${focusRing}`}>
            <LogoMark className="h-8 w-8 shrink-0 text-label" />
            <span className="truncate text-[17px] font-semibold tracking-tight">CipherMesh</span>
          </Link>

          <nav aria-label="Main" className="hidden sm:block">
            <ul className="well flex items-center gap-0.5 rounded-full p-1">
              {NAV.map(({ href, label, Icon }) => {
                const active = isActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition ${focusRing} ${
                        active ? "glass-strong text-label" : "text-label-2 hover:text-label"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                      {href === "/approvals" ? <Badge count={pending} /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <StatusDot />
            <ThemeToggle className="hidden lg:flex" />
            <button
              type="button"
              onClick={() => setHelp(true)}
              aria-label="How to use CipherMesh"
              title="How to use CipherMesh"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-label-2 transition hover:bg-[rgb(var(--glass)/0.6)] hover:text-label ${focusRing}`}
            >
              <CircleHelp className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setSettings({ open: true, focus: "api" })}
              aria-label="Settings"
              title="Settings"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-label-2 transition hover:bg-[rgb(var(--glass)/0.6)] hover:text-label ${focusRing}`}
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div id="main" className="pb-28 sm:pb-12">
        {children}
      </div>

      {/* iOS-style tab bar on phones */}
      <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:hidden">
        <ul className="glass-strong mx-auto grid max-w-md grid-cols-3 rounded-[26px] p-1.5">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[20px] text-[11px] font-semibold transition ${focusRing} ${
                    active ? "bg-tint/[0.12] text-tint-text" : "text-label-2"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                  {href === "/approvals" && pending ? (
                    <span className="absolute right-[22%] top-1.5 h-2.5 w-2.5 rounded-full bg-[#D70015] ring-2 ring-[rgb(var(--glass))]">
                      <span className="sr-only">{pending} waiting</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Sheet open={help} onClose={() => setHelp(false)} title="How to use CipherMesh" subtitle="Three steps. No setup needed.">
        <HelpBody onTry={tryExample} onDone={() => setHelp(false)} />
      </Sheet>
      <Sheet open={settings.open} onClose={() => setSettings((s) => ({ ...s, open: false }))} title="Settings">
        <SettingsBody focus={settings.focus} onDone={() => setSettings((s) => ({ ...s, open: false }))} />
      </Sheet>
    </>
  );
}
