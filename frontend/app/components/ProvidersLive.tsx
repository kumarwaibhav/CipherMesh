"use client";

import { useCallback } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { usePolling } from "./usePolling";

/** The live provider registry: region, residency, list vs negotiated price, latency, circuit state. */
export function ProvidersLive() {
  const fetchProviders = useCallback((signal: AbortSignal) => api.providers(signal), []);
  const { data, error, loading } = usePolling(fetchProviders, 60_000);
  if (loading && !data) {
    return (
      <p className="flex items-center gap-2 text-[15px] text-label-2">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading the live provider registry…
      </p>
    );
  }
  if (error || !data) return <p className="text-[15px] text-label-2">The live provider registry isn’t reachable right now.</p>;
  return (
    <div className="scrollbar-thin -mx-1 overflow-x-auto px-1" tabIndex={0} role="region" aria-label="Provider registry, scrolls sideways on small screens">
      <table className="w-full min-w-[640px] text-left text-[14px]">
        <caption className="sr-only">Live provider registry</caption>
        <thead>
          <tr className="text-[12px] text-label-2">
            {["Provider", "Region", "Residency", "List $/1k", "Negotiated $/1k", "p95 latency", "Circuit"].map((h) => (
              <th key={h} scope="col" className="sep border-b px-3 pb-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.provider_id} className="sep border-b last:border-0">
              <th scope="row" className="px-3 py-2.5 font-semibold text-label">
                {p.display_name}
              </th>
              <td className="px-3 py-2.5 font-mono text-[13px] text-label-2">{p.region}</td>
              <td className="px-3 py-2.5 text-label">{p.data_residency}</td>
              <td className="px-3 py-2.5 tabular-nums text-label-2">{p.cost_per_1k_requests_usd.toFixed(2)}</td>
              <td className="px-3 py-2.5 font-semibold tabular-nums text-label">{p.contract_price_per_1k_usd != null ? p.contract_price_per_1k_usd.toFixed(2) : "—"}</td>
              <td className="px-3 py-2.5 tabular-nums text-label-2">{p.p95_latency_ms} ms</td>
              <td className={`px-3 py-2.5 font-semibold ${p.circuit === "OPEN" ? "text-block-text" : "text-allow-text"}`}>{p.circuit === "OPEN" ? "Open" : "Closed"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
