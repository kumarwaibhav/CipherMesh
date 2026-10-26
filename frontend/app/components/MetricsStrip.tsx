import type { MetricsResponse } from "@/lib/api";

function Stat({ label, value, dot, mono = false }: { label: string; value: string; dot?: string; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-3 shadow-card">
      <dt className="flex items-center gap-1.5 truncate font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">
        {dot ? <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" /> : null}
        {label}
      </dt>
      <dd
        className={`mt-1 tabular-nums text-zinc-50 ${mono ? "font-mono text-lg font-medium" : "text-2xl font-semibold leading-tight"}`}
      >
        {value}
      </dd>
    </div>
  );
}

export function MetricsStrip({ data, error }: { data: MetricsResponse | null; error: string | null }) {
  const dash = "—";
  const n = (v: number | undefined) => (typeof v === "number" ? v.toLocaleString() : dash);
  const ms = (v: number | undefined) => (typeof v === "number" ? `${v.toFixed(1)} ms` : dash);

  return (
    <section aria-label="Gateway metrics" className="min-w-0">
      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
        <Stat label="Requests" value={n(data?.requests_total)} />
        <Stat label="Allow" value={n(data?.decisions?.ALLOW)} dot="bg-emerald-400" />
        <Stat label="Redact" value={n(data?.decisions?.REDACT)} dot="bg-amber-400" />
        <Stat label="Review" value={n(data?.decisions?.REVIEW)} dot="bg-sky-400" />
        <Stat label="Block" value={n(data?.decisions?.BLOCK)} dot="bg-red-500" />
        <Stat label="Pending" value={n(data?.pending_reviews)} dot="bg-sky-400" />
        <Stat label="Mean latency" value={ms(data?.mean_latency_ms)} mono />
        <Stat label="p95 latency" value={ms(data?.p95_latency_ms)} mono />
      </dl>
      {error ? <p className="mt-2 text-xs text-red-300" role="status">Metrics unavailable: {error}</p> : null}
    </section>
  );
}
