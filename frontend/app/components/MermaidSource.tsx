"use client";

import { useCallback, useEffect, useState } from "react";
import { GitBranch, Loader2, RefreshCw } from "lucide-react";
import { api, errorMessage, type GraphResponse } from "@/lib/api";
import { Card, ErrorBanner, focusRing } from "./ui";

/** Mermaid labels from LangGraph carry HTML (<p>, &nbsp;). Render them as plain text only. */
export function mermaidToText(source: string): string {
  return source
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?[a-zA-Z][^<>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

export function MermaidSource() {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.graph(signal);
      if (signal?.aborted) return;
      setGraph(res);
    } catch (err) {
      if (signal?.aborted) return;
      setError(errorMessage(err));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <Card
      title="Live LangGraph definition"
      icon={<GitBranch className="h-4 w-4" />}
      id="mermaid"
      actions={
        <button
          type="button"
          onClick={() => void load()}
          className={`inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 ${focusRing}`}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Reload
        </button>
      }
    >
      <p className="mb-3 text-sm text-zinc-400">
        Mermaid source served by <code className="font-mono text-zinc-200">GET /api/v1/graph</code>, generated from the
        compiled graph at runtime.
      </p>
      {error ? <ErrorBanner message={error} /> : null}
      {loading && !graph ? (
        <p className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading graph…
        </p>
      ) : null}
      {graph ? (
        <div className="flex flex-col gap-3">
          <pre
            role="region"
            aria-label="Mermaid graph source"
            tabIndex={0}
            className={`force-dark scrollbar-thin max-h-[480px] overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-200 ${focusRing}`}
          >
            {mermaidToText(graph.mermaid)}
          </pre>
          <p className="text-xs text-zinc-400">
            {graph.nodes.length} nodes · {graph.edges.length} edges
          </p>
        </div>
      ) : null}
    </Card>
  );
}
