"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Clock, Inbox, Loader2, Lock, RefreshCw, ShieldOff } from "lucide-react";
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
import { categoryName, verdictCopy } from "@/lib/friendly";
import { useSession } from "@/lib/session";
import { LargeTitle } from "./AppShell";
import { RedactedText } from "./RedactedText";
import { PromptDocument, Verdict } from "./Result";
import { ReplyCard } from "./ResultPanels";
import { ErrorBanner, smooth, buttonPlain, buttonPrimary, buttonSecondary, focusRing, inputBase } from "./ui";
import { POLL_INTERVAL_MS, usePolling } from "./usePolling";

type AccessState = "locked" | "disabled";

const REVIEWER_KEY = "cm-reviewer-name";
const REVIEWER_EVENT = "ciphermesh:reviewer-name";
type ReviewFetch = { kind: "ok"; tickets: ReviewTicket[] } | { kind: AccessState };

function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return "";
  if (ms <= 0) return "Expiring now";
  return `Expires in ${Math.ceil(ms / 60000)} min`;
}

function TicketRow({
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
  const [confirmDeny, setConfirmDeny] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const denyRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmShown = useRef(false);

  useEffect(() => {
    const load = () => {
      try {
        const saved = window.localStorage.getItem(REVIEWER_KEY) || "";
        setReviewer((cur) => cur || saved);
      } catch {
        /* ignore */
      }
    };
    load();
    window.addEventListener(REVIEWER_EVENT, load);
    return () => window.removeEventListener(REVIEWER_EVENT, load);
  }, []);

  // Keep keyboard focus on the matching control when the confirm row opens and closes.
  useEffect(() => {
    if (confirmDeny) cancelRef.current?.focus();
    else if (confirmShown.current) denyRef.current?.focus();
    confirmShown.current = confirmDeny;
  }, [confirmDeny]);

  const decide = async (approved: boolean) => {
    const name = reviewer.trim();
    if (!name) {
      setError("Add your name first, so the decision is recorded against you.");
      setConfirmDeny(false);
      return;
    }
    try {
      window.localStorage.setItem(REVIEWER_KEY, name);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(REVIEWER_EVENT));
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
      setConfirmDeny(false);
    }
  };

  return (
    <li className="surface flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[15px] font-semibold text-label">
          {ticket.categories.map(categoryName).join(" · ") || "Held for review"}
        </p>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-label-2">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {timeLeft(ticket.expires_at)}
        </span>
      </div>

      {ticket.safe_preview ? (
        <p className="fill-2 whitespace-pre-wrap break-words rounded-xl px-4 py-3 font-mono text-[15px] leading-8 text-label">
          <RedactedText text={ticket.safe_preview} />
        </p>
      ) : null}

      <p className="text-[13px] text-label-2">
        Requested model: {requestedProviderLabel(ticket.requested_provider)}. If you approve, it goes to the private local model instead.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor={reviewerId} className="mb-1.5 block text-[13px] font-medium text-label">
            Your name
          </label>
          <input
            id={reviewerId}
            type="text"
            value={reviewer}
            maxLength={64}
            autoComplete="name"
            placeholder="Priya, Security"
            onChange={(e) => setReviewer(e.target.value)}
            className={inputBase}
          />
        </div>
        {confirmDeny ? (
          <div key="confirm" className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm deny">
            <span className="text-[13px] text-label-2">Discard this prompt?</span>
            <button ref={cancelRef} type="button" onClick={() => setConfirmDeny(false)} className={`${buttonSecondary} ${focusRing}`}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => decide(false)}
              disabled={pending !== null}
              className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-destructive px-5 text-[15px] font-semibold text-white transition hover:bg-destructive-hover active:scale-[0.97] disabled:opacity-60 ${focusRing}`}
            >
              {pending === "deny" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Deny
            </button>
          </div>
        ) : (
          <div key="actions" className="flex items-center gap-2">
            <button
              ref={denyRef}
              type="button"
              onClick={() => setConfirmDeny(true)}
              disabled={pending !== null}
              className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-[15px] font-semibold text-block-text transition hover:bg-block/10 active:scale-[0.97] disabled:opacity-60 ${focusRing}`}
            >
              Deny…
            </button>
            <button type="button" onClick={() => decide(true)} disabled={pending !== null} className={`${buttonPrimary} ${focusRing}`}>
              {pending === "approve" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Approve
            </button>
          </div>
        )}
      </div>
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
    </li>
  );
}

function Unlock({ onUnlocked, rejected }: { onUnlocked: () => void; rejected: boolean }) {
  const id = useId();
  const [value, setValue] = useState("");
  const [failed, setFailed] = useState(false);
  return (
    <form
      className="surface flex flex-col gap-4 rounded-2xl p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        if (writeReviewerToken(value)) onUnlocked();
        else setFailed(true);
      }}
    >
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-label-2" aria-hidden="true" />
        <div>
          <h2 className="text-[17px] font-semibold">Reviewers Only</h2>
          <p className="mt-0.5 text-[15px] text-label-2">Enter the reviewer key from your administrator. It stays in this browser.</p>
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
        <button type="submit" disabled={!value.trim()} className={`${buttonPrimary} ${focusRing}`}>
          Unlock
        </button>
      </div>
      {failed ? <p className="text-[15px] font-medium text-block-text">This browser blocked saving the key.</p> : null}
      {rejected && !failed ? (
        <p role="alert" className="text-[15px] font-medium text-block-text">
          That key wasn’t accepted. Check it with your administrator and try again.
        </p>
      ) : null}
    </form>
  );
}

export function Approvals() {
  const { record } = useSession();
  const [access, setAccess] = useState<AccessState | null>(null);
  const [decided, setDecided] = useState<InspectResponse | null>(null);
  const [triedKey, setTriedKey] = useState(false);
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
    if (data?.kind === "ok") setTriedKey(false);
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
    <main className="mx-auto flex max-w-[880px] flex-col gap-5 px-4 sm:px-6">
      <LargeTitle
        title="Approvals"
        subtitle="Prompts that mention something internal wait here. Nothing is sent until a person decides."
        actions={
          <button
            type="button"
            onClick={() => (access !== null ? setAccess(null) : refresh())}
            disabled={access === "disabled"}
            className={`${buttonPlain} ${focusRing}`}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        }
      />

      <p role="status" className="sr-only">{decided ? verdictCopy(decided).headline : ""}</p>
      <div ref={topRef} className="flex scroll-mt-20 flex-col gap-4 lg:scroll-mt-6">
        {decided ? (
          <>
            <Verdict result={decided} showApprovalsLink={false} onReset={() => setDecided(null)} resetLabel="Done" />
            <PromptDocument original={null} result={decided} />
            {decided.response ? <ReplyCard response={decided.response} /> : null}
          </>
        ) : null}
      </div>

      {access === "locked" ? (
        <Unlock
          rejected={triedKey}
          onUnlocked={() => {
            setTriedKey(true);
            setAccess(null);
          }}
        />
      ) : null}
      {access === "disabled" ? (
        <div className="surface flex items-start gap-3 rounded-2xl p-5 text-[15px] text-label-2">
          <ShieldOff className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          Approvals are turned off on this server.
        </div>
      ) : null}
      {!access && error ? <ErrorBanner message={`Couldn’t load approvals. ${error}`} /> : null}
      {!access && loading && !data && !error ? (
        <p className="flex items-center justify-center gap-2 py-10 text-[15px] text-label-2">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading…
        </p>
      ) : null}
      {!access && data?.kind === "ok" && tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <Inbox className="h-10 w-10 text-label-3" aria-hidden="true" />
          <p className="text-[17px] font-semibold">Nothing Waiting</p>
          <p className="max-w-sm text-[15px] text-label-2">When a prompt needs a person to decide, it appears here.</p>
        </div>
      ) : null}
      {!access && tickets.length > 0 ? (
        <section aria-labelledby="waiting-heading" className="flex flex-col gap-2.5">
          <h2 id="waiting-heading" className="px-1 text-[15px] font-semibold text-label-2">
            {tickets.length} Waiting
          </h2>
          <ul className="flex flex-col gap-3">
            {tickets.map((t) => (
              <TicketRow
                key={t.review_id}
                ticket={t}
                onAccessLost={setAccess}
                onDecided={(res) => {
                  setDecided(res);
                  record(res, null, "review --decide", "approval");
                  refresh();
                  requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: smooth(), block: "start" }));
                }}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
