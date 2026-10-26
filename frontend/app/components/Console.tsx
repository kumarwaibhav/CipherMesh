"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api, errorMessage, type InspectResponse, type TargetProvider } from "@/lib/api";
import { DecisionCard } from "./DecisionCard";
import { MetricsStrip } from "./MetricsStrip";
import { PromptForm } from "./PromptForm";
import { FindingsTable, ProviderSeesPanel, ResponsePanel, RoutePanel, VaultPanel } from "./ResultPanels";
import { ReviewQueue } from "./ReviewQueue";
import { TelemetryTerminal, type TraceRun } from "./TelemetryTerminal";
import { Card, ErrorBanner } from "./ui";
import { POLL_INTERVAL_MS, usePolling } from "./usePolling";

const MAX_RUNS = 20;

export function Console() {
  const [result, setResult] = useState<InspectResponse | null>(null);
  const [source, setSource] = useState<"inspect" | "review" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<TraceRun[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);
  const runCounter = useRef(0);

  // One shared /metrics poll feeds the strip and the (possibly locked) review queue's pending count.
  const fetchMetrics = useCallback((signal: AbortSignal) => api.metrics(signal), []);
  const metrics = usePolling(fetchMetrics, POLL_INTERVAL_MS);
  const refreshMetrics = metrics.refresh;
  useEffect(() => {
    if (refreshKey > 0) refreshMetrics();
  }, [refreshKey, refreshMetrics]);

  const record = useCallback((res: InspectResponse, label: string) => {
    runCounter.current += 1;
    const run: TraceRun = {
      key: `${res.request_id}-${runCounter.current}`,
      requestId: res.request_id,
      label,
      decision: res.action_decision,
      telemetry: Array.isArray(res.telemetry) ? res.telemetry : [],
      graphPath: Array.isArray(res.graph_path) ? res.graph_path : [],
    };
    setRuns((prev) => [...prev, run].slice(-MAX_RUNS));
  }, []);

  const handleInspect = useCallback(
    async (prompt: string, provider: TargetProvider) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setBusy(true);
      setError(null);
      try {
        const res = await api.inspect({ prompt, target_provider: provider }, controller.signal);
        if (controller.signal.aborted) return;
        setResult(res);
        setSource("inspect");
        record(res, `inspect --target ${provider}`);
        setRefreshKey((k) => k + 1);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(errorMessage(err));
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    },
    [record],
  );

  const handleReviewDecided = useCallback(
    (res: InspectResponse) => {
      setResult(res);
      setSource("review");
      setError(null);
      record(res, "review --decide");
      setRefreshKey((k) => k + 1);
    },
    [record],
  );

  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-5 sm:px-6 lg:gap-6 lg:py-6">
      <h1 className="sr-only">CipherMesh console</h1>
      <MetricsStrip data={metrics.data} error={metrics.error} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-8 lg:gap-6">
          <PromptForm busy={busy} onSubmit={handleInspect} />
          {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
          <DecisionCard result={result} source={source} />
          {result ? (
            <>
              <ProviderSeesPanel result={result} />
              <FindingsTable findings={Array.isArray(result.findings) ? result.findings : []} />
              {result.route ? <RoutePanel route={result.route} /> : null}
              {result.response ? <ResponsePanel response={result.response} /> : null}
            </>
          ) : (
            <Card bodyClassName="p-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <ShieldCheck className="h-8 w-8 text-red-500" aria-hidden="true" />
                <p className="text-sm font-medium text-zinc-200">No prompt inspected yet</p>
                <p className="max-w-md text-sm text-zinc-400">
                  Pick a sample or paste a prompt, then press Inspect &amp; Route. CipherMesh will detect sensitive
                  data, apply policy, seal the original in the vault and route only what is safe.
                </p>
              </div>
            </Card>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:col-span-4 lg:gap-6" aria-label="Trace, reviews and vault">
          <div className="lg:sticky lg:top-4 lg:z-10">
            <TelemetryTerminal runs={runs} busy={busy} />
          </div>
          <ReviewQueue
            refreshKey={refreshKey}
            pendingCount={typeof metrics.data?.pending_reviews === "number" ? metrics.data.pending_reviews : null}
            onDecided={handleReviewDecided}
          />
          <VaultPanel vault={result?.vault ?? null} />
        </aside>
      </div>
    </main>
  );
}
