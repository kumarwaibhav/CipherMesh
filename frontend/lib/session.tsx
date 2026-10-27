"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { ActionDecision, InspectResponse, RequestStatus } from "./api";
import { foundNames } from "./friendly";

export interface TraceRun {
  key: string;
  requestId: string;
  label: string;
  decision: ActionDecision;
  telemetry: InspectResponse["telemetry"];
  graphPath: string[];
}

/**
 * One row of this browser session's history. The original prompt is never kept here:
 * only the decision, what was found, and the text that was actually sent.
 */
export interface HistoryEntry {
  id: string;
  at: number;
  decision: ActionDecision;
  status: RequestStatus;
  provider: string | null;
  found: string[];
  sentText: string | null;
  source: "check" | "approval";
}

interface Session {
  busy: boolean;
  setBusy: (busy: boolean) => void;
  runs: TraceRun[];
  history: HistoryEntry[];
  last: { result: InspectResponse; original: string | null } | null;
  record: (result: InspectResponse, original: string | null, label: string, source?: "check" | "approval") => void;
  clearLast: () => void;
}

const SessionContext = createContext<Session | null>(null);
const MAX = 30;

/** Fired whenever the approvals queue may have changed, so badges refresh immediately. */
export const PENDING_CHANGED_EVENT = "ciphermesh:pending-changed";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const [runs, setRuns] = useState<TraceRun[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [last, setLast] = useState<Session["last"]>(null);
  const counter = useRef(0);

  const record = useCallback<Session["record"]>((result, original, label, source = "check") => {
    counter.current += 1;
    window.dispatchEvent(new Event(PENDING_CHANGED_EVENT));
    const key = `${result.request_id}-${counter.current}`;
    setRuns((prev) =>
      [
        ...prev,
        {
          key,
          requestId: result.request_id,
          label,
          decision: result.action_decision,
          telemetry: Array.isArray(result.telemetry) ? result.telemetry : [],
          graphPath: Array.isArray(result.graph_path) ? result.graph_path : [],
        },
      ].slice(-MAX),
    );
    setHistory((prev) =>
      [
        {
          id: key,
          at: Date.now(),
          decision: result.action_decision,
          status: result.status,
          provider: result.routed_provider,
          found: foundNames(Array.isArray(result.findings) ? result.findings : []),
          sentText: result.processed_prompt,
          source,
        },
        ...prev,
      ].slice(0, MAX),
    );
    if (source === "check") setLast({ result, original });
  }, []);

  const clearLast = useCallback(() => setLast(null), []);

  const value = useMemo(
    () => ({ busy, setBusy, runs, history, last, record, clearLast }),
    [busy, runs, history, last, record, clearLast],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
