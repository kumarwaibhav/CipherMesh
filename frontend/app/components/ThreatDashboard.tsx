"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowUpRight, ExternalLink, Loader2, Radio, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { INCIDENTS, VECTORS, type Control, type Incident, type Severity, type VectorId } from "@/lib/threats";
import { usePolling } from "./usePolling";
import { focusRing } from "./ui";

const VCOLOR: Record<VectorId, string> = Object.fromEntries(VECTORS.map((v, i) => [v.id, `var(--v${i + 1})`])) as Record<VectorId, string>;
const YEARS = ["2023", "2024", "2025", "2026"] as const;
const SEVERITIES: Severity[] = ["Critical", "High", "Medium"];
const CONTROLS: Array<{ id: Control; label: string; note: string; tone: string }> = [
  { id: "Prevents", label: "Prevents", note: "Stopped at the prompt", tone: "bg-accent" },
  { id: "Limits", label: "Limits", note: "Vendor leak exposes placeholders", tone: "bg-[rgb(var(--accent)/0.6)]" },
  { id: "Partial", label: "Partial", note: "Reply inspection helps", tone: "bg-[rgb(var(--accent)/0.3)]" },
  { id: "Out of scope", label: "Out of Scope", note: "Needs other controls", tone: "bg-[var(--fill)]" },
];

function monthLabel(date: string): string {
  return new Date(`${date}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

function Chip({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] transition-colors ${focusRing} ${
        active ? "bg-label font-semibold text-[rgb(var(--canvas))]" : "fill font-medium text-label hover:bg-[var(--fill)]"
      }`}
    >
      {color ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

function Panel({ title, sub, children, className = "" }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <figure className={`surface min-w-0 rounded-3xl p-5 sm:p-6 ${className}`}>
      <figcaption>
        <span className="block text-[17px] font-semibold tracking-[-0.01em]">{title}</span>
        {sub ? <span className="mt-0.5 block text-[13px] text-label-2">{sub}</span> : null}
      </figcaption>
      <div className="mt-5">{children}</div>
    </figure>
  );
}

/** Stacked columns: one per year, segments per vector, 2px surface gaps, hover tooltip. */
function YearChart({ data, onPick }: { data: Incident[]; onPick: (v: VectorId) => void }) {
  const [hover, setHover] = useState<{ year: string; v: VectorId; n: number } | null>(null);
  const byYear = YEARS.map((y) => ({ y, rows: VECTORS.map((v) => ({ v: v.id, n: data.filter((i) => i.date.startsWith(y) && i.vector === v.id).length })) }));
  const max = Math.max(1, ...byYear.map((b) => b.rows.reduce((s, r) => s + r.n, 0)));
  const H = 200;
  return (
    <div className="relative">
      <p className="sr-only">{byYear.map((b) => `${b.y}: ${b.rows.reduce((s, r) => s + r.n, 0)} incidents`).join("; ")}</p>
      <div className="flex h-[220px] items-end gap-4 border-b border-[var(--separator)] px-1 sm:gap-8" aria-hidden="true">
        {byYear.map(({ y, rows }) => {
          const total = rows.reduce((s, r) => s + r.n, 0);
          return (
            <div key={y} className="flex flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[13px] font-semibold tabular-nums text-label">{total}</span>
              <div className="flex w-full max-w-[56px] flex-col-reverse gap-[2px]" style={{ height: (total / max) * H }}>
                {rows
                  .filter((r) => r.n > 0)
                  .map((r, i, arr) => (
                    <button
                      key={r.v}
                      type="button"
                      tabIndex={-1}
                      onMouseEnter={() => setHover({ year: y, v: r.v, n: r.n })}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => onPick(r.v)}
                      className={`w-full transition-opacity ${i === arr.length - 1 ? "rounded-t-[4px]" : ""} ${hover && (hover.year !== y || hover.v !== r.v) ? "opacity-50" : ""}`}
                      style={{ height: `${(r.n / total) * 100}%`, background: VCOLOR[r.v], minHeight: 3 }}
                    />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 px-1 pt-2 sm:gap-8">
        {YEARS.map((y) => (
          <span key={y} className="flex-1 text-center text-[13px] text-label-2">
            {y}
          </span>
        ))}
      </div>
      {hover ? (
        <div className="glass pointer-events-none absolute right-2 top-0 rounded-xl px-3 py-2 text-[13px] [--glass-a:0.96]">
          <span className="flex items-center gap-1.5 font-semibold text-label">
            <span className="h-2 w-2 rounded-full" style={{ background: VCOLOR[hover.v] }} aria-hidden="true" />
            {VECTORS.find((v) => v.id === hover.v)?.label}
          </span>
          <span className="text-label-2">
            {hover.year}: {hover.n} incident{hover.n === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}
      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] text-label-2 sm:grid-cols-3">
        {VECTORS.map((v) => (
          <li key={v.id} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: VCOLOR[v.id] }} aria-hidden="true" />
            {v.short}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HBars({ rows, colorOf, onPick, active }: { rows: Array<{ id: string; label: string; n: number }>; colorOf?: (id: string) => string; onPick?: (id: string) => void; active?: string | null }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const content = (
          <>
            <span className="truncate text-left text-label">{r.label}</span>
            <span className="fill h-2.5 overflow-hidden rounded-full">
              <span
                className="block h-full rounded-full transition-[width] duration-500 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]"
                style={{ width: `${(r.n / max) * 100}%`, background: colorOf ? colorOf(r.id) : "rgb(var(--accent))" }}
              />
            </span>
            <span className="w-6 text-right font-semibold tabular-nums text-label">{r.n}</span>
          </>
        );
        const cls = "grid w-full grid-cols-[minmax(0,10.5rem)_1fr_auto] items-center gap-3 rounded-lg py-0.5 text-[13px]";
        return (
          <li key={r.id}>
            {onPick ? (
              <button
                type="button"
                aria-pressed={active === r.id}
                onClick={() => onPick(r.id)}
                className={`${cls} ${focusRing} ${active && active !== r.id ? "opacity-45" : ""} hover:bg-[var(--fill-2)]`}
              >
                {content}
              </button>
            ) : (
              <div className={cls}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function LiveFeed() {
  const fetchFeed = useCallback((signal: AbortSignal) => api.threatsLive(signal), []);
  const { data, error, loading } = usePolling(fetchFeed, 15 * 60_000);
  return (
    <section aria-labelledby="live-title" className="surface rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="live-title" className="flex items-center gap-2 text-[17px] font-semibold">
          <Radio className={`h-4 w-4 ${data?.available ? "text-allow-text" : "text-label-2"}`} aria-hidden="true" />
          Live Feed
        </h2>
        <span className="text-[13px] text-label-2">
          {data?.available ? (
            <>
              From the{" "}
              <a href={data.source_url} target="_blank" rel="noopener noreferrer" className={`rounded underline underline-offset-2 hover:text-label ${focusRing}`}>
                {data.source}
              </a>
              {data.fetched_at ? ` · updated ${new Date(data.fetched_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
            </>
          ) : (
            "Security-related reports from the AI Incident Database"
          )}
        </span>
      </div>
      {loading && !data ? (
        <p className="mt-6 flex items-center gap-2 text-[15px] text-label-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Fetching the latest reports…
        </p>
      ) : error || !data?.available ? (
        <p className="mt-4 text-[15px] text-label-2">The live source isn’t reachable right now. The verified incidents below are unaffected.</p>
      ) : data.items.length === 0 ? (
        <p className="mt-4 text-[15px] text-label-2">No new security-related reports in the latest feed.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--separator)]">
          {data.items.slice(0, 8).map((item) => (
            <li key={item.link} className="py-3">
              <a href={item.link} target="_blank" rel="noopener noreferrer" className={`group block rounded ${focusRing}`}>
                <span className="block text-[13px] text-label-2">{item.published ?? "Recent"}</span>
                <span className="mt-0.5 flex items-start gap-1 text-[15px] font-semibold leading-snug text-label group-hover:underline">
                  {item.title}
                  <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-label-2" aria-hidden="true" />
                </span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ThreatDashboard() {
  const [vector, setVector] = useState<VectorId | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);

  const scoped = useMemo(() => INCIDENTS.filter((i) => (!year || i.date.startsWith(year)) && (!severity || i.severity === severity)), [year, severity]);
  const filtered = useMemo(() => [...scoped].filter((i) => !vector || i.vector === vector).sort((a, b) => b.date.localeCompare(a.date)), [scoped, vector]);

  const vectorRows = VECTORS.map((v) => ({ id: v.id, label: v.label, n: scoped.filter((i) => i.vector === v.id).length })).sort((a, b) => b.n - a.n);
  const sectors = Object.entries(filtered.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.sector]: (acc[i.sector] ?? 0) + 1 }), {}))
    .map(([id, n]) => ({ id, label: id, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 7);
  const controlCounts = CONTROLS.map((c) => ({ ...c, n: filtered.filter((i) => i.control === c.id).length }));
  const total = filtered.length;
  const critical = filtered.filter((i) => i.severity === "Critical").length;
  const reset = () => {
    setVector(null);
    setYear(null);
    setSeverity(null);
  };
  const anyFilter = vector || year || severity;

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-4 sm:px-6">
      {/* KPIs */}
      <dl className="surface grid grid-cols-2 divide-[var(--separator)] rounded-3xl sm:grid-cols-4 sm:divide-x">
        {[
          ["Incidents shown", String(total)],
          ["Rated critical", String(critical)],
          ["Attack vectors", String(new Set(filtered.map((i) => i.vector)).size)],
          ["CipherMesh prevents or limits", String(filtered.filter((i) => i.control === "Prevents" || i.control === "Limits").length)],
        ].map(([k, v]) => (
          <div key={k} className="p-5 sm:p-6">
            <dt className="text-[13px] text-label-2">{k}</dt>
            <dd className="mt-1 text-[32px] font-bold leading-none tracking-[-0.02em] tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Filters */}
      <div className="flex flex-col gap-2.5" role="group" aria-label="Filters">
        <div className="scrollbar-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <Chip active={!vector} onClick={() => setVector(null)}>
            All Vectors
          </Chip>
          {VECTORS.map((v) => (
            <Chip key={v.id} active={vector === v.id} onClick={() => setVector(vector === v.id ? null : v.id)} color={VCOLOR[v.id]}>
              <span className="whitespace-nowrap">{v.label}</span>
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {YEARS.map((y) => (
            <Chip key={y} active={year === y} onClick={() => setYear(year === y ? null : y)}>
              {y}
            </Chip>
          ))}
          <span className="mx-1 h-5 w-px bg-[var(--separator)]" aria-hidden="true" />
          {SEVERITIES.map((s) => (
            <Chip key={s} active={severity === s} onClick={() => setSeverity(severity === s ? null : s)}>
              {s}
            </Chip>
          ))}
          {anyFilter ? (
            <button type="button" onClick={reset} className={`ml-1 inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-accent-text ${focusRing}`}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </button>
          ) : null}
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Incidents per Year" sub="Stacked by attack vector. Select a segment to filter.">
          <YearChart data={scoped} onPick={(v) => setVector(vector === v ? null : v)} />
        </Panel>
        <Panel title="Attack Vectors" sub="Select a vector to filter the list.">
          <HBars rows={vectorRows} colorOf={(id) => VCOLOR[id as VectorId]} onPick={(id) => setVector(vector === id ? null : (id as VectorId))} active={vector} />
          <p className="mt-5 text-[13px] leading-relaxed text-label-2">
            {vector ? VECTORS.find((v) => v.id === vector)?.blurb : "Leakage, platform exposure and prompt injection are where the prompt itself is the attack surface."}
          </p>
        </Panel>
        <Panel title="Sectors Affected" sub={anyFilter ? "Within the current filter" : "Across all tracked incidents"}>
          <HBars rows={sectors} />
        </Panel>
        <Panel title="Where CipherMesh Acts" sub="An honest read of which incidents a prompt checkpoint addresses.">
          <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
            {controlCounts
              .filter((c) => c.n > 0)
              .map((c) => (
                <span key={c.id} className={`h-full ${c.tone}`} style={{ width: `${(c.n / Math.max(1, total)) * 100}%` }} />
              ))}
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {controlCounts.map((c) => (
              <li key={c.id} className="flex items-start gap-2.5">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${c.tone}`} aria-hidden="true" />
                <span>
                  <span className="text-[15px] font-semibold text-label">
                    {c.n} · {c.label}
                  </span>
                  <span className="block text-[13px] text-label-2">{c.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Incident list (the table view) */}
        <section aria-labelledby="list-title" className="surface rounded-3xl">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 sm:px-6">
            <h2 id="list-title" className="text-[17px] font-semibold">
              Incidents
            </h2>
            <span className="text-[13px] text-label-2" aria-live="polite">
              {total} shown, newest first
            </span>
          </div>
          {total === 0 ? (
            <p className="px-6 py-10 text-[15px] text-label-2">No incidents match these filters.</p>
          ) : (
            <ol className="mt-3 divide-y divide-[var(--separator)]">
              {filtered.map((i) => (
                <li key={i.id} className="px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-label-2">
                    <span className="tabular-nums">{monthLabel(i.date)}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: VCOLOR[i.vector] }} aria-hidden="true" />
                      {VECTORS.find((v) => v.id === i.vector)?.label}
                    </span>
                    <span className={i.severity === "Critical" ? "font-semibold text-label" : ""}>{i.severity}</span>
                  </div>
                  <h3 className="mt-1.5 text-[16px] font-semibold leading-snug text-label">{i.title}</h3>
                  <p className="mt-0.5 text-[13px] text-label-2">
                    {i.org} · {i.sector}
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-label">{i.impact}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-label-2">
                    <span className="font-semibold text-label">CipherMesh: {i.control}.</span> {i.controlNote}
                  </p>
                  <a
                    href={i.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-2 inline-flex items-center gap-1 rounded text-[13px] font-semibold text-accent-text hover:underline ${focusRing}`}
                  >
                    {i.source.name}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only"> (source, opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ol>
          )}
        </section>
        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <LiveFeed />
        </div>
      </div>
    </div>
  );
}
