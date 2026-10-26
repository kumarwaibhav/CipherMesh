"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Ban, Clock, Inbox, Loader2, Lock, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react";
import {
  TOKENS_CHANGED_EVENT,
  api,
  errorMessage,
  requestedProviderLabel,
  reviewAccessState,
  writeReviewerToken,
  type InspectResponse,
  type ReviewTicket,
} from "@/lib/api";
import { categoryName } from "@/lib/friendly";
import { RedactedText } from "./RedactedText";
import { Comparison, Verdict } from "./Result";
import { ReplyCard } from "./ResultPanels";
import { ErrorBanner, buttonPrimary, buttonSecondary, focusRing, inputBase } from "./ui";
import { POLL_INTERVAL_MS, usePolling } from "./usePolling";

type AccessState = "locked" | "disabled";
type ReviewFetch = { kind: "ok"; tickets: ReviewTicket[] } | { kind: AccessState };

function minutesLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return "";
  if (ms <= 0) return "expiring now";
  const m = Math.ceil(ms / 60000);
  return `expires in ${m} min`;
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
  const [reviewer, setReviewer] = useState("");
  const [pending, setPending] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setReviewer(window.localStorage.getItem("cm-reviewer-name") || "");
    } catch {
      /* ignore */
    }
  }, []);

  const decide = async (approved: boolean) => {
    const name = reviewer.trim();
    if (!name) {
      setError("Type your name first, so the decision is recorded against you.");
      return;
    }
    try {
      window.localStorage.setItem("cm-reviewer-name", name);
    } catch {
      /* ignore */
    }
    setPending(approved ? "approve" : "deny");
    setError(null);
    try {
      onDecided(await api.decideReview(ticket.review_id, { approved, reviewer: name }));
    } catch (err) {
      const access = reviewAccessState(err);
      if (access) onAccessLost(access);
      else setError(errorMessage(err));
    } finally {
      setPending(null);
    }
  };

  return (
    <li className="glass flex flex-col gap-4 rounded-3xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {ticket.categories.map((c) => (
            <span key={c} className="rounded-full bg-review/15 px-3 py-1 text-[13px] font-semibold text-review-text">
              {categoryName(c)}
            </span>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-label-2">
          <Clock className="h-4 w-4" aria-hidden="true" />
          {minutesLeft(ticket.expires_at)}
        </span>
      </div>

      {ticket.safe_preview ? (
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-label-2">Preview (private parts already hidden)</p>
          <p className="well whitespace-pre-wrap break-words rounded-2xl px-4 py-3 font-mono text-[14px] leading-7 text-label">
            <RedactedText text={ticket.safe_preview} />
          </p>
        </div>
      ) : null}

      <p className="text-sm text-label-2">
        Asked to go to <span className="font-semibold text-label">{requestedProviderLabel(ticket.requested_provider)}</span>. If you
        approve, it goes to the private local model instead.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor={reviewerId} className="mb-1.5 block text-[13px] font-semibold text-label">
            Your name
          </label>
          <input
            id={reviewerId}
            type="text"
            value={reviewer}
            maxLength={64}
            autoComplete="name"
            placeholder="e.g. Priya, Security"
            onChange={(e) => setReviewer(e.target.value)}
            className={inputBase}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => decide(false)}
            disabled={pending !== null}
            className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full bg-block/[0.12] px-5 text-[15px] font-semibold text-block-text transition hover:bg-block/20 disabled:opacity-60 sm:flex-none ${focusRing}`}
          >
            {pending === "deny" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Ban className="h-4 w-4" aria-hidden="true" />}
            Deny
          </button>
          <button
            type="button"
            onClick={() => decide(true)}
            disabled={pending !== null}
            className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full bg-allow-text px-5 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-[rgb(31_122_54)] sm:flex-none ${focusRing}`}
          >
            {pending === "approve" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            Approve
          </button>
        </div>
      </div>
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
    </li>
  );
}

function Unlock({ onUnlocked }: { onUnlocked: () => void }) {
  const id = useId();
  const [value, setValue] = useState("");
  const [failed, setFailed] = useState(false);
  return (
    <form
      className="glass flex flex-col gap-4 rounded-3xl p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        if (writeReviewerToken(value)) onUnlocked();
        else setFailed(true);
      }}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-review text-white">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-[17px] font-semibold">Reviewers only</h2>
          <p className="mt-0.5 text-[15px] text-label-2">
            Enter the reviewer key your administrator gave you. It stays in this browser.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={id} className="sr-only">
          Reviewer key
        </label>
        <input
          id={id}
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Reviewer key"
          className={`${inputBase} font-mono sm:flex-1`}
        />
        <button type="submit" className={`${buttonPrimary} ${focusRing}`}>
          Unlock
        </button>
      </div>
      {failed ? <p className="text-sm font-medium text-block-text">This browser blocked saving the key.</p> : null}
    </form>
  );
}

export function Approvals() {
  const [access, setAccess] = useState<AccessState | null>(null);
  const [decided, setDecided] = useState<InspectResponse | null>(null);
  const fetchReviews = useCallback(async (signal: AbortSignal): Promise<ReviewFetch> => {
    try {
      return { kind: "ok", tickets: await api.reviews("PENDING", signal) };
    } catch (err) {
      const state = reviewAccessState(err);
      if (state) return { kind: state };
      throw err;
    }
  }, []);
  const { data, error, loading, refresh } = usePolling(fetchReviews, POLL_INTERVAL_MS, { enabled: access === null });

  useEffect(() => {
    if (data && data.kind !== "ok") setAccess(data.kind);
  }, [data]);

  useEffect(() => {
    const onTokens = () => {
      if (access !== null) setAccess(null);
      else refresh();
    };
    window.addEventListener(TOKENS_CHANGED_EVENT, onTokens);
    return () => window.removeEventListener(TOKENS_CHANGED_EVENT, onTokens);
  }, [access, refresh]);

  const topRef = useRef<HTMLDivElement>(null);
  const tickets = data?.kind === "ok" ? data.tickets : [];

  return (
    <main className="mx-auto flex max-w-[880px] flex-col gap-6 px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-semibold tracking-tight sm:text-[40px]">Approvals</h1>
          <p className="mt-1 max-w-xl text-[17px] text-label-2">
            When a prompt mentions something internal, CipherMesh holds it here until a person decides.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (access !== null ? setAccess(null) : refresh())}
          disabled={access === "disabled"}
          className={`${buttonSecondary} ${focusRing}`}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="How approvals work">
        {[
          ["1", "Held", "Nothing is sent while a prompt waits here."],
          ["2", "You decide", "Approve or deny. Your name is recorded."],
          ["3", "Sent privately", "Approved prompts go only to the private local model."],
        ].map(([n, t, d]) => (
          <li key={n} className="glass-thin flex gap-3 rounded-3xl p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-review text-[13px] font-bold text-white" aria-hidden="true">
              {n}
            </span>
            <div>
              <p className="text-[15px] font-semibold">{t}</p>
              <p className="text-sm text-label-2">{d}</p>
            </div>
          </li>
        ))}
      </ol>

      <div ref={topRef} className="flex scroll-mt-24 flex-col gap-4" aria-live="polite">
        {decided ? (
          <>
            <Verdict result={decided} showApprovalsLink={false} onReset={() => setDecided(null)} />
            <Comparison original={null} result={decided} />
            {decided.response ? <ReplyCard response={decided.response} /> : null}
          </>
        ) : null}
      </div>

      {access === "locked" ? <Unlock onUnlocked={() => setAccess(null)} /> : null}
      {access === "disabled" ? (
        <div className="glass flex items-start gap-3 rounded-3xl p-5 text-[15px] text-label-2">
          <ShieldOff className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          Approvals are turned off on this server.
        </div>
      ) : null}
      {!access && error ? <ErrorBanner message={`Couldn’t load approvals: ${error}`} /> : null}
      {!access && loading && !data && !error ? (
        <p className="flex items-center justify-center gap-2 py-8 text-[15px] text-label-2">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading…
        </p>
      ) : null}
      {!access && data?.kind === "ok" && tickets.length === 0 ? (
        <div className="glass flex flex-col items-center gap-2 rounded-3xl px-6 py-12 text-center">
          <Inbox className="h-10 w-10 text-label-3" aria-hidden="true" />
          <p className="text-[17px] font-semibold">All clear</p>
          <p className="max-w-sm text-[15px] text-label-2">Nothing is waiting for approval. Held prompts will appear here.</p>
        </div>
      ) : null}
      {!access && tickets.length > 0 ? (
        <section aria-labelledby="waiting-heading" className="flex flex-col gap-3">
          <h2 id="waiting-heading" className="px-1 text-[15px] font-semibold text-label-2">
            {tickets.length} waiting
          </h2>
          <ul className="flex flex-col gap-4">
            {tickets.map((t) => (
              <TicketCard
                key={t.review_id}
                ticket={t}
                onAccessLost={setAccess}
                onDecided={(res) => {
                  setDecided(res);
                  refresh();
                  requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
                }}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
