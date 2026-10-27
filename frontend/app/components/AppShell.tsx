"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { BarChart3, BookOpen, Check, CircleHelp, Inbox, KeyRound, Settings, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { API_BASE_URL, OPEN_SETTINGS_EVENT, api, readReviewerToken, readToken, writeReviewerToken, writeToken } from "@/lib/api";
import { PENDING_EXAMPLE_KEY, RUN_EXAMPLE_EVENT } from "@/lib/samples";
import { PENDING_CHANGED_EVENT, SessionProvider, useSession } from "@/lib/session";
import { LogoMark } from "./Logo";
import { Sheet } from "./Sheet";
import { ThemeToggle, useFollowSystemTheme } from "./ThemeToggle";
import { buttonPrimary, buttonSecondary, focusRing, iconButton, inputBase } from "./ui";
import { POLL_INTERVAL_MS, usePolling } from "./usePolling";

export const OPEN_HELP_EVENT = "ciphermesh:open-help";

const NAV = [
  { href: "/", label: "Check", Icon: ShieldCheck },
  { href: "/approvals", label: "Approvals", Icon: Inbox },
  { href: "/activity", label: "Activity", Icon: BarChart3 },
  { href: "/architecture", label: "How It Works", Icon: BookOpen },
] as const;

const TITLES: Record<string, string> = {
  "/": "Check",
  "/approvals": "Approvals",
  "/activity": "Activity",
  "/architecture": "How It Works",
};

function activeIndex(pathname: string): number {
  return NAV.findIndex((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)));
}

/** The selection plate moves the moment a finger or pointer goes down, not when the route resolves. */
function useNavIndex(pathname: string): [number, (i: number) => void] {
  const [pressed, setPressed] = useState<number | null>(null);
  useEffect(() => setPressed(null), [pathname]);
  return [pressed ?? activeIndex(pathname), setPressed];
}

function usePendingCount(): number | null {
  const fetchMetrics = useCallback((signal: AbortSignal) => api.metrics(signal), []);
  const { data, refresh } = usePolling(fetchMetrics, POLL_INTERVAL_MS);
  useEffect(() => {
    window.addEventListener(PENDING_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(PENDING_CHANGED_EVENT, refresh);
  }, [refresh]);
  return typeof data?.pending_reviews === "number" ? data.pending_reviews : null;
}

function useHealth() {
  const fetchHealth = useCallback((signal: AbortSignal) => api.health(signal), []);
  const { data, error, loading } = usePolling(fetchHealth, 60_000);
  const online = !error && data?.status === "ok";
  const checking = loading && !data && !error;
  return {
    online,
    checking,
    label: checking ? "Connecting…" : online ? "Protection on" : "Can’t reach the gateway",
    detail: online && data ? `v${data.version} · ${data.mode.toLowerCase()} policy` : error ?? API_BASE_URL,
  };
}

function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 6);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return scrolled;
}

function Badge({ count, className = "" }: { count: number | null; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={`inline-flex min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-5 text-white tabular-nums ${className}`}
    >
      <span className="sr-only">, </span>
      {count > 99 ? "99+" : count}
      <span className="sr-only"> waiting</span>
    </span>
  );
}

function Sidebar({ pathname, pending, onHelp, onSettings }: { pathname: string; pending: number | null; onHelp: () => void; onSettings: () => void }) {
  const { busy } = useSession();
  const health = useHealth();
  const [index, press] = useNavIndex(pathname);
  return (
    <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-[244px] flex-col rounded-[20px] p-3 lg:flex" aria-label="Sidebar">
      <Link href="/" aria-label="CipherMesh, Check" className={`flex items-center gap-2.5 rounded-xl px-2 py-2 ${focusRing}`}>
        <LogoMark draw busy={busy} className="h-8 w-8 shrink-0 text-label" />
        <span className="text-[17px] font-semibold tracking-[-0.01em]">CipherMesh</span>
      </Link>

      <nav aria-label="Main" className="mt-5">
        <ul className="relative flex flex-col gap-0.5">
          <span
            aria-hidden="true"
            className={`absolute inset-x-0 top-0 h-10 rounded-[10px] bg-[rgb(var(--surface))] shadow-surface transition-[transform,opacity] duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] ${index < 0 ? "opacity-0" : ""}`}
            style={{ transform: `translateY(${Math.max(index, 0) * 42}px)` }}
          />
          {NAV.map(({ href, label, Icon }, i) => {
            const active = i === index;
            return (
              <li key={href} className="relative">
                <Link
                  href={href}
                  onPointerDown={() => press(i)}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-10 items-center gap-3 rounded-[10px] px-3 text-[15px] transition-colors ${focusRing} ${
                    active ? "font-semibold text-label" : "font-medium text-label-2 hover:bg-[var(--fill-2)] hover:text-label"
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] ${active ? "text-accent-text" : ""}`} aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  {href === "/approvals" ? <Badge count={pending} /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        <p role="status" aria-live="polite" title={health.detail} className="flex items-center gap-2 px-3 py-2 text-[13px] text-label-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${health.checking ? "bg-label-3" : health.online ? "bg-allow" : "bg-block"}`} aria-hidden="true" />
          <span className="min-w-0 truncate">{health.label}</span>
        </p>
        <div className="sep flex items-center gap-1 border-t pt-2">
          <button type="button" onClick={onHelp} className={`flex h-10 flex-1 items-center gap-2.5 rounded-[10px] px-3 text-[15px] font-medium text-label-2 hover:bg-[var(--fill-2)] hover:text-label ${focusRing}`}>
            <CircleHelp className="h-[18px] w-[18px]" aria-hidden="true" />
            Quick Tour
          </button>
          <button type="button" onClick={onSettings} aria-label="Settings" title="Settings" className={`${iconButton} ${focusRing}`}>
            <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/** Phones and tablets: a top bar whose glass appears only once content scrolls beneath it. */
function TopBar({ pathname, onHelp, onSettings }: { pathname: string; onHelp: () => void; onSettings: () => void }) {
  const { busy } = useSession();
  const scrolled = useScrolled();
  const health = useHealth();
  return (
    <header data-scrolled={scrolled} className="glass bar scroll-edge sticky top-0 z-30 lg:hidden">
      <div className="mx-auto flex h-14 max-w-[880px] items-center justify-between gap-2 px-2 sm:px-4">
        <Link href="/" aria-label="CipherMesh, Check" className={`flex min-w-0 items-center gap-2 rounded-full p-1.5 ${focusRing}`}>
          <LogoMark draw busy={busy} className="h-8 w-8 shrink-0 text-label" />
          <span
            className={`truncate text-[17px] font-semibold tracking-[-0.01em] transition-opacity duration-200 ${scrolled ? "opacity-100" : "opacity-0"}`}
            aria-hidden={!scrolled}
          >
            {TITLES[NAV[Math.max(activeIndex(pathname), 0)].href]}
          </span>
        </Link>
        <div className="flex items-center">
          <span role="status" aria-live="polite" title={health.detail} className="flex h-11 items-center gap-1.5 px-2 text-[13px] font-medium text-label-2">
            <span className={`h-2 w-2 rounded-full ${health.checking ? "bg-label-3" : health.online ? "bg-allow" : "bg-block"}`} aria-hidden="true" />
            <span aria-hidden="true">{health.checking ? "…" : health.online ? "On" : "Offline"}</span>
            <span className="sr-only">{health.label}</span>
          </span>
          <button type="button" onClick={onHelp} aria-label="Quick Tour" className={`${iconButton} ${focusRing}`}>
            <CircleHelp className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={onSettings} aria-label="Settings" className={`${iconButton} ${focusRing}`}>
            <Settings className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

function TabBar({ pathname, pending }: { pathname: string; pending: number | null }) {
  const [index, press] = useNavIndex(pathname);
  return (
    <nav aria-label="Tabs" className="tabbar fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-10 bottom-0 bg-gradient-to-t from-[rgb(var(--canvas)/0.9)] to-transparent" />
      <ul className="glass bar relative mx-auto grid max-w-[460px] grid-cols-4 rounded-full p-1">
        <span
          aria-hidden="true"
          className={`absolute bottom-1 left-1 top-1 rounded-full bg-[var(--fill)] transition-[transform,opacity] duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] ${index < 0 ? "opacity-0" : ""}`}
          style={{ width: "calc((100% - 8px) / 4)", transform: `translateX(${Math.max(index, 0) * 100}%)` }}
        />
        {NAV.map(({ href, label, Icon }, i) => {
          const active = i === index;
          return (
            <li key={href} className="relative">
              <Link
                href={href}
                onPointerDown={() => press(i)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-full text-[11px] transition-colors ${focusRing} ${
                  active ? "font-bold text-accent-text" : "font-medium text-label"
                }`}
              >
                <span className="relative">
                  <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
                  {href === "/approvals" && pending ? (
                    <span className="absolute -right-2 -top-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-[rgb(var(--glass))]">
                      <span className="sr-only">{pending} waiting</span>
                    </span>
                  ) : null}
                </span>
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
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
    if (focus === "reviewer") reviewerRef.current?.focus();
  }, [focus]);

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        const ok = writeToken(apiToken) && writeReviewerToken(reviewerToken);
        setSaved(ok ? "saved" : "failed");
        if (ok) window.setTimeout(onDone, 450);
      }}
    >
      <section className="flex flex-col gap-2">
        <h3 className="text-[15px] font-semibold text-label">Appearance</h3>
        <ThemeToggle withLabels />
        <p className="text-[13px] text-label-2">Automatic follows your device and switches with it.</p>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-label">Access Keys</h3>
          <p className="mt-1 text-[13px] text-label-2">Only needed if your administrator gave you one. Saved in this browser only.</p>
        </div>
        <div>
          <label htmlFor={reviewerId} className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium">
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
            className={`${inputBase} font-mono placeholder:font-sans`}
          />
        </div>
        <div>
          <label htmlFor={apiId} className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium">
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
            className={`${inputBase} font-mono placeholder:font-sans`}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <span role="status" aria-live="polite" className="mr-auto text-[15px] font-medium">
          {saved === "saved" ? (
            <span className="inline-flex items-center gap-1 text-allow-text">
              <Check className="h-4 w-4" aria-hidden="true" /> Saved
            </span>
          ) : saved === "failed" ? (
            <span className="text-block-text">This browser blocked saving.</span>
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

const TOUR = [
  { title: "Paste What You Plan to Send", text: "Anything you’d give an AI tool: an email, notes, code, a customer record." },
  { title: "Press Check", text: "CipherMesh finds passwords, keys, personal details and internal links in under a second." },
  { title: "Send What’s Safe", text: "You see exactly what the AI will receive. Secrets are stopped; personal details are hidden." },
] as const;

function TourBody({ onTry, onDone }: { onTry: () => void; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col gap-5">
        {TOUR.map(({ title, text }, i) => (
          <li key={title} className="flex gap-4">
            <span className="fill flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-label" aria-hidden="true">
              {i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[17px] font-semibold">
                <span className="sr-only">Step {i + 1}: </span>
                {title}
              </p>
              <p className="mt-0.5 text-[15px] text-label-2">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="fill-2 rounded-xl px-4 py-3 text-[15px] text-label-2">
        Anything that mentions an internal link waits in <span className="font-semibold text-label">Approvals</span> for a person to
        decide. Approved text only goes to a private model inside your company.
      </p>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onDone} className={`${buttonSecondary} ${focusRing}`}>
          Done
        </button>
        <button type="button" onClick={onTry} className={`${buttonPrimary} ${focusRing}`}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Try an Example
        </button>
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pending = usePendingCount();
  useFollowSystemTheme();
  const [settings, setSettings] = useState<{ open: boolean; focus: "api" | "reviewer" }>({ open: false, focus: "api" });
  const [tour, setTour] = useState(false);

  useEffect(() => {
    const onSettings = (e: Event) => {
      const detail = (e as CustomEvent<{ focus?: "api" | "reviewer" }>).detail;
      setSettings({ open: true, focus: detail?.focus === "reviewer" ? "reviewer" : "api" });
    };
    const onHelp = () => setTour(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, onSettings);
    window.addEventListener(OPEN_HELP_EVENT, onHelp);
    return () => {
      window.removeEventListener(OPEN_SETTINGS_EVENT, onSettings);
      window.removeEventListener(OPEN_HELP_EVENT, onHelp);
    };
  }, []);

  const tryExample = () => {
    setTour(false);
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent(RUN_EXAMPLE_EVENT, { detail: { id: "pii" } }));
    } else {
      try {
        window.sessionStorage.setItem(PENDING_EXAMPLE_KEY, "pii");
      } catch {
        /* ignore */
      }
      router.push("/");
    }
  };

  const openSettings = () => setSettings({ open: true, focus: "api" });

  return (
    <>
      <div className="canvas" aria-hidden="true" />
      <a href="#main" className="glass sr-only z-50 rounded-full px-4 py-2 text-[15px] font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Sidebar pathname={pathname} pending={pending} onHelp={() => setTour(true)} onSettings={openSettings} />
      <div className="lg:pl-[256px]">
        <TopBar pathname={pathname} onHelp={() => setTour(true)} onSettings={openSettings} />
        <div id="main" className="pb-32 lg:pb-16">
          {children}
        </div>
      </div>
      <TabBar pathname={pathname} pending={pending} />

      <Sheet open={tour} onClose={() => setTour(false)} title="Quick Tour" subtitle="Three steps. Nothing to set up." hideClose>
        <TourBody onTry={tryExample} onDone={() => setTour(false)} />
      </Sheet>
      <Sheet open={settings.open} onClose={() => setSettings((s) => ({ ...s, open: false }))} title="Settings" hideClose>
        <SettingsBody focus={settings.focus} onDone={() => setSettings((s) => ({ ...s, open: false }))} />
      </Sheet>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}

/** Apple-style large title that sits in the content and scrolls away under the bar. */
export function LargeTitle({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="pb-2 pt-4 lg:pt-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-[34px] font-bold leading-[1.15] tracking-[-0.022em] text-label">{title}</h1>
        {actions ? <div className="-mr-3 flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {subtitle ? <p className="mt-1.5 max-w-[60ch] text-[17px] leading-snug text-label-2">{subtitle}</p> : null}
    </div>
  );
}
