"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, KeyRound, Settings, ShieldCheck, UserCheck } from "lucide-react";
import {
  API_BASE_URL,
  OPEN_SETTINGS_EVENT,
  api,
  readReviewerToken,
  readToken,
  writeReviewerToken,
  writeToken,
} from "@/lib/api";
import { POLL_INTERVAL_MS, usePolling } from "./usePolling";
import { focusRing, inputBase } from "./ui";

const NAV = [
  { href: "/", label: "Console" },
  { href: "/architecture", label: "Architecture" },
] as const;

function HealthPill({ intervalMs }: { intervalMs: number }) {
  const fetchHealth = useCallback((signal: AbortSignal) => api.health(signal), []);
  const { data, error, loading } = usePolling(fetchHealth, intervalMs);
  const online = !error && data?.status === "ok";
  const label = loading && !data && !error ? "Checking" : online ? "API online" : "API offline";
  const tone = loading && !data && !error
    ? "border-zinc-700 bg-zinc-900 text-zinc-300"
    : online
      ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
      : "border-red-500/50 bg-red-950/40 text-red-300";
  const dot = loading && !data && !error ? "bg-zinc-500" : online ? "bg-emerald-400" : "bg-red-500";
  const title = online && data
    ? `v${data.version} · graph ${data.graph} · vault ${data.vault} · mode ${data.mode} · uptime ${Math.round(data.uptime_s)}s`
    : error ?? `Polling ${API_BASE_URL}/api/v1/health`;

  return (
    <div
      role="status"
      aria-live="polite"
      title={title}
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {online ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /> : null}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
      </span>
      <span>{label}</span>
      {online && data ? (
        <span className="hidden font-mono text-[11px] text-emerald-200/80 sm:inline">
          v{data.version} · {data.mode}
        </span>
      ) : null}
    </div>
  );
}

function TokenSettings({
  onClose,
  focus,
  focusKey,
}: {
  onClose: () => void;
  focus: "api" | "reviewer";
  focusKey: number;
}) {
  const apiId = useId();
  const reviewerId = useId();
  const reviewerHelpId = useId();
  const [apiToken, setApiToken] = useState("");
  const [reviewerToken, setReviewerToken] = useState("");
  const [saved, setSaved] = useState<"idle" | "saved" | "failed">("idle");
  const apiRef = useRef<HTMLInputElement>(null);
  const reviewerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setApiToken(readToken());
    setReviewerToken(readReviewerToken());
  }, []);

  useEffect(() => {
    (focus === "reviewer" ? reviewerRef : apiRef).current?.focus();
  }, [focus, focusKey]);

  return (
    <form
      className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 pb-4 lg:flex-row lg:items-start sm:px-6"
      onSubmit={(e) => {
        e.preventDefault();
        const ok = writeToken(apiToken) && writeReviewerToken(reviewerToken);
        setSaved(ok ? "saved" : "failed");
      }}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={apiId} className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          API token (sent as X-CipherMesh-Token, stored in this browser only)
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
          placeholder="Leave empty when the server has no CIPHERMESH_API_TOKEN"
          className={`${inputBase} font-mono`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <label htmlFor={reviewerId} className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Reviewer token
        </label>
        <input
          id={reviewerId}
          ref={reviewerRef}
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={reviewerToken}
          aria-describedby={reviewerHelpId}
          onChange={(e) => {
            setReviewerToken(e.target.value);
            setSaved("idle");
          }}
          placeholder="Sent as X-CipherMesh-Reviewer-Token"
          className={`${inputBase} font-mono`}
        />
        <p id={reviewerHelpId} className="mt-1 text-[11px] text-zinc-400">
          Required to view and decide held prompts.
        </p>
      </div>
      <div className="flex items-center gap-2 lg:pt-5">
        <button
          type="submit"
          className={`rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 ${focusRing}`}
        >
          Save tokens
        </button>
        <button
          type="button"
          onClick={onClose}
          className={`rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 ${focusRing}`}
        >
          Close
        </button>
        <span role="status" aria-live="polite" className="min-w-[4.5rem] text-xs">
          {saved === "saved" ? (
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Saved
            </span>
          ) : saved === "failed" ? (
            <span className="text-red-300">Storage unavailable</span>
          ) : null}
        </span>
      </div>
    </form>
  );
}

export function Header() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ target: "api" | "reviewer"; key: number }>({
    target: "api",
    key: 0,
  });

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ focus?: "api" | "reviewer" }>).detail;
      const target = detail?.focus === "reviewer" ? "reviewer" : "api";
      setFocusRequest((prev) => ({ target, key: prev.key + 1 }));
      setSettingsOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
  }, []);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/75">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 shadow-lg shadow-red-900/40">
            <ShieldCheck className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <Link href="/" className={`rounded text-lg font-extrabold tracking-[0.22em] text-white ${focusRing}`}>
              CIPHER<span className="text-red-500">MESH</span>
            </Link>
            <p className="text-xs text-zinc-400 sm:text-[13px]">
              Protect every prompt. Across every model. Before data leaves.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <nav aria-label="Primary">
            <ul className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md px-3 py-1.5 text-sm font-medium ${focusRing} ${
                        active ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-100"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {/* The console polls health; other pages only need a one-off check. */}
          <HealthPill intervalMs={pathname === "/" ? POLL_INTERVAL_MS : 0} />
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
            aria-controls="cm-settings"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white ${focusRing}`}
            aria-label="Token settings"
            title="Token settings"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div id="cm-settings" hidden={!settingsOpen}>
        {settingsOpen ? (
          <TokenSettings
            focus={focusRequest.target}
            focusKey={focusRequest.key}
            onClose={() => setSettingsOpen(false)}
          />
        ) : null}
      </div>
    </header>
  );
}
