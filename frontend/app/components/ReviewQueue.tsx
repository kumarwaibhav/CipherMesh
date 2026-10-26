"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Ban, Inbox, Loader2, Lock, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react";
import {
  TOKENS_CHANGED_EVENT,
  api,
  errorMessage,
  openSettings,
  requestedProviderLabel,
  reviewAccessState,
  type InspectResponse,
  type ReviewTicket,
} from "@/lib/api";
import { RedactedText } from "./RedactedText";
import { Card, EmptyState, ErrorBanner, focusRing, inputBase } from "./ui";
import { POLL_INTERVAL_MS, usePolling } from "./usePolling";

type AccessState = "locked" | "disabled";
type ReviewFetch = { kind: "ok"; tickets: ReviewTicket[] } | { kind: AccessState };

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function TicketCard({
  ticket,
  onDecided,
  onAccessLost,
}: {
  ticket: ReviewTicket;
  onDecided: (result: InspectResponse) => void;
  onAccessLost: (state: AccessState) => void;
}) {
  const reviewerId = useId();
  const [reviewer, setReviewer] = useState("security-lead");
  const [pending, setPending] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (approved: boolean) => {
    const name = reviewer.trim();
    if (!name) {
      setError("Enter a reviewer name before deciding.");
      return;
    }
    setPending(approved ? "approve" : "deny");
    setError(null);
    try {
      const result = await api.decideReview(ticket.review_id, { approved, reviewer: name });
      onDecided(result);
    } catch (err) {
      const access = reviewAccessState(err);
      if (access) onAccessLost(access);
      else setError(errorMessage(err));
    } finally {
      setPending(null);
    }
  };

  return (
    <li className="rounded-lg border border-sky-500/30 bg-sky-950/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="break-all font-mono text-xs font-semibold text-sky-200">{ticket.review_id}</span>
        <span className="text-[11px] text-zinc-400">
          {formatTime(ticket.created_at)} · expires {formatTime(ticket.expires_at)}
        </span>
      </div>
      {ticket.categories.length ? (
        <ul className="mt-2 flex flex-wrap gap-1" aria-label="Categories">
          {ticket.categories.map((c) => (
            <li key={c} className="rounded bg-sky-500/15 px-1.5 py-0.5 font-mono text-[11px] text-sky-200 ring-1 ring-inset ring-sky-500/30">
              {c}
            </li>
          ))}
        </ul>
      ) : null}
      {ticket.safe_preview ? (
        <p className="mt-2 whitespace-pre-wrap break-words rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 font-mono text-xs leading-relaxed text-zinc-200">
          <RedactedText text={ticket.safe_preview} />
        </p>
      ) : null}
      {ticket.reasons.length ? (
        <ul className="mt-2 space-y-0.5 text-[11px] text-zinc-400">
          {ticket.reasons.map((r, i) => (
            <li key={i} className="break-words">{r}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-1 text-[11px] text-zinc-400">Requested: {requestedProviderLabel(ticket.requested_provider)}</p>

      <div className="mt-3 flex flex-col gap-2">
        <div>
          <label htmlFor={reviewerId} className="mb-1 block text-[11px] font-medium text-zinc-300">
            Reviewer name
          </label>
          <input
            id={reviewerId}
            type="text"
            value={reviewer}
            maxLength={64}
            autoComplete="off"
            onChange={(e) => setReviewer(e.target.value)}
            className={`${inputBase} py-1.5 text-xs`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => decide(true)}
            disabled={pending !== null}
            className={`inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-300 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
          >
            {pending === "approve" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Approve (local tier only)
          </button>
          <button
            type="button"
            onClick={() => decide(false)}
            disabled={pending !== null}
            className={`inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
          >
            {pending === "deny" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Deny
          </button>
        </div>
        {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
      </div>
    </li>
  );
}

function AccessNotice({ state }: { state: AccessState }) {
  if (state === "disabled") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-3 text-sm text-zinc-300">
        <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
        <p className="min-w-0">Review console disabled on this deployment.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-sky-500/30 bg-sky-950/20 px-3 py-3 text-sm text-sky-100">
      <p className="flex items-start gap-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
        <span className="min-w-0">Reviewer sign-in required — enter the reviewer token in Settings.</span>
      </p>
      <button
        type="button"
        onClick={() => openSettings("reviewer")}
        className={`self-start rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-900/40 ${focusRing}`}
      >
        Open settings
      </button>
    </div>
  );
}

export function ReviewQueue({
  refreshKey,
  pendingCount,
  onDecided,
}: {
  refreshKey: number;
  /** Pending count from the public /metrics endpoint, shown while the queue itself is locked. */
  pendingCount: number | null;
  onDecided: (result: InspectResponse) => void;
}) {
  const [access, setAccess] = useState<AccessState | null>(null);
  const fetchReviews = useCallback(async (signal: AbortSignal): Promise<ReviewFetch> => {
    try {
      return { kind: "ok", tickets: await api.reviews("PENDING", signal) };
    } catch (err) {
      const state = reviewAccessState(err);
      if (state) return { kind: state };
      throw err;
    }
  }, []);
  // While locked or disabled, stop polling; a token change in Settings re-enables it.
  const { data, error, loading, refresh } = usePolling(fetchReviews, POLL_INTERVAL_MS, { enabled: access === null });

  useEffect(() => {
    if (data && data.kind !== "ok") setAccess(data.kind);
  }, [data]);

  useEffect(() => {
    const onTokens = () => {
      if (access !== null) setAccess(null);
      else refresh();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith("ciphermesh.")) onTokens();
    };
    window.addEventListener(TOKENS_CHANGED_EVENT, onTokens);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(TOKENS_CHANGED_EVENT, onTokens);
      window.removeEventListener("storage", onStorage);
    };
  }, [access, refresh]);

  const accessRef = useRef(access);
  accessRef.current = access;
  useEffect(() => {
    if (refreshKey > 0 && accessRef.current === null) refresh();
  }, [refreshKey, refresh]);

  const tickets = data?.kind === "ok" ? data.tickets : [];
  const shownCount = access === null && data?.kind === "ok" ? tickets.length : pendingCount;

  return (
    <Card
      title="Review queue"
      icon={<Inbox className="h-4 w-4" />}
      id="review-queue"
      actions={
        <>
          <span className="rounded-full bg-sky-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-300 ring-1 ring-inset ring-sky-500/30">
            {typeof shownCount === "number" ? shownCount : "—"} pending
          </span>
          <button
            type="button"
            onClick={() => (access !== null ? setAccess(null) : refresh())}
            disabled={access === "disabled"}
            className={`rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
            aria-label="Refresh review queue"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {access ? <AccessNotice state={access} /> : null}
        {!access && error ? <ErrorBanner message={`Review queue unavailable: ${error}`} /> : null}
        {!access && loading && !data && !error ? (
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading reviews…
          </p>
        ) : null}
        {!access && !error && data && data.kind !== "ok" ? (
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking reviewer access…
          </p>
        ) : null}
        {!access && data?.kind === "ok" && tickets.length === 0 ? (
          <EmptyState>No prompts are waiting for human review.</EmptyState>
        ) : null}
        {!access && tickets.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {tickets.map((t) => (
              <TicketCard key={t.review_id} ticket={t} onDecided={onDecided} onAccessLost={setAccess} />
            ))}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}
