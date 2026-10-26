import type { MetricsResponse } from "@/lib/api";

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2">
      <dt className="truncate text-[11px] font-medium uppercase tracking-wider text-zinc-400">{label}</dt>
      <dd className={`mt-0.5 font-mono text-lg font-semibold tabular-nums ${tone ?? "text-zinc-100"}`}>{value}</dd>
    </div>
  );
}

export function MetricsStrip({ data, error }: { data: MetricsResponse | null; error: string | null }) {
  const dash = "—";
  const n = (v: number | undefined) => (typeof v === "number" ? v.toLocaleString() : dash);
  const ms = (v: number | undefined) => (typeof v === "number" ? `${v.toFixed(1)} ms` : dash);

  return (
    <section aria-label="Gateway metrics" className="min-w-0">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <Stat label="Requests" value={n(data?.requests_total)} />
        <Stat label="Allow" value={n(data?.decisions?.ALLOW)} tone="text-emerald-300" />
        <Stat label="Redact" value={n(data?.decisions?.REDACT)} tone="text-amber-300" />
        <Stat label="Review" value={n(data?.decisions?.REVIEW)} tone="text-sky-300" />
        <Stat label="Block" value={n(data?.decisions?.BLOCK)} tone="text-red-300" />
        <Stat label="Pending reviews" value={n(data?.pending_reviews)} tone="text-sky-200" />
        <Stat label="Mean latency" value={ms(data?.mean_latency_ms)} />
        <Stat label="p95 latency" value={ms(data?.p95_latency_ms)} />
      </dl>
      {error ? <p className="mt-2 text-xs text-red-300" role="status">Metrics unavailable: {error}</p> : null}
    </section>
  );
}
