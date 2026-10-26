import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Header } from "../components/Header";
import { LogoMark, Wordmark } from "../components/Logo";
import { focusRing } from "../components/ui";

export const metadata: Metadata = {
  title: "Brand",
  description: "CipherMesh brand guidelines: logo, colour, typography and voice.",
};

const CORE = [
  { name: "Graphite", hex: "#0B0C0E", role: "Dark ground. Every dark screen starts here." },
  { name: "Carbon", hex: "#16181C", role: "Dark panels, cards and the trace terminal." },
  { name: "Steel", hex: "#2A2E35", role: "Borders and dividers on dark." },
  { name: "Fog", hex: "#969BA4", role: "Secondary labels on dark (7:1)." },
  { name: "Paper", hex: "#F6F5F2", role: "Light ground, and text on dark (17:1)." },
  { name: "Signal Red", hex: "#E5202A", role: "The brand core. Marks and primary buttons." },
] as const;

const DECISIONS = [
  { label: "ALLOW", dark: "#3DDC84", light: "#0E6A3D", text: "Sent unchanged.", cls: "text-emerald-300 ring-emerald-500/40 bg-emerald-500/10" },
  { label: "REDACT", dark: "#F5B13D", light: "#8A4D0B", text: "Two values were masked. Only the clean text was sent.", cls: "text-amber-300 ring-amber-500/40 bg-amber-500/10" },
  { label: "REVIEW", dark: "#4DA3FF", light: "#154A91", text: "Held for a reviewer. Nothing has been sent yet.", cls: "text-sky-300 ring-sky-500/40 bg-sky-500/10" },
  { label: "BLOCK", dark: "#FF7A80", light: "#A3121A", text: "Nothing was sent. Rotate this key now.", cls: "text-red-300 ring-red-500/40 bg-red-500/10" },
] as const;

const ASSETS = [
  { file: "/brand/mark-light-ink.svg", label: "Mark · for dark backgrounds" },
  { file: "/brand/mark-dark-ink.svg", label: "Mark · for light backgrounds" },
  { file: "/brand/mark-mono-black.svg", label: "Mark · mono black" },
  { file: "/brand/mark-mono-white.svg", label: "Mark · mono white" },
  { file: "/brand/app-icon.svg", label: "App icon" },
] as const;

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">{eyebrow}</p>
        <h2 id={id} className="mt-1 text-xl font-semibold tracking-tight text-zinc-50">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default function BrandPage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-[1440px] flex-col gap-12 px-4 py-8 sm:px-6">
        <div className="mesh-grid relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-12 shadow-card sm:px-12">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <LogoMark className="h-24 w-24 shrink-0 text-zinc-50 sm:h-32 sm:w-32" title="CipherMesh mark" />
            <div className="min-w-0">
              <Wordmark className="block text-4xl text-zinc-50 sm:text-6xl" />
              <p className="mt-3 max-w-2xl text-lg text-zinc-300">
                Protect every prompt. Across every model. Before data leaves.
              </p>
            </div>
          </div>
        </div>

        <Section id="logo" eyebrow="01 · Logo" title="One gate, one guarded path">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ["The mesh", "Six nodes on a hexagon: every model, every cloud."],
              ["The gate", "One open side. The only way out runs through it."],
              ["The core", "Signal Red: the prompt we protect and its one inspected path."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-card">
                <p className="font-semibold text-zinc-50">{t}</p>
                <p className="mt-1 text-sm text-zinc-300">{d}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="force-dark flex items-center justify-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-10">
              <LogoMark className="h-14 w-14 text-zinc-50" />
              <Wordmark className="text-3xl text-zinc-50" />
            </div>
            <div className="flex items-center justify-center gap-4 rounded-2xl border border-[#E4E4E0] bg-[#F6F5F2] px-6 py-10 text-[#14161A]">
              <LogoMark className="h-14 w-14" />
              <span className="text-3xl font-bold tracking-[0.06em]">
                CIPHER<span className="text-[#C8141E]">MESH</span>
              </span>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-2 text-sm text-zinc-300 sm:grid-cols-2">
            <li>Keep two node-diameters of clear space on every side.</li>
            <li>Minimum size: 16 px for the simple mark, 120 px wide for the lockup.</li>
            <li>Never rotate the gate, stretch the mark or recolour the core.</li>
            <li>Never place the red core on a red background; use the mono white mark.</li>
          </ul>
        </Section>

        <Section id="colour" eyebrow="02 · Colour" title="Dark by default. Red means a decision.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CORE.map((c) => (
              <div key={c.hex} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-card">
                <div className="h-24 border-b border-zinc-800" style={{ backgroundColor: c.hex }} aria-hidden="true" />
                <div className="p-3">
                  <p className="text-sm font-semibold text-zinc-50">{c.name}</p>
                  <p className="font-mono text-xs text-zinc-400">{c.hex}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">{c.role}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DECISIONS.map((d) => (
              <div key={d.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-card">
                <span className={`inline-flex rounded-md px-2 py-0.5 font-mono text-xs font-bold tracking-wider ring-1 ring-inset ${d.cls}`}>
                  {d.label}
                </span>
                <p className="mt-3 font-mono text-xs text-zinc-400">
                  dark {d.dark} · light {d.light}
                </p>
                <p className="mt-1.5 text-sm text-zinc-200">{d.text}</p>
              </div>
            ))}
          </div>
          <p className="max-w-3xl text-sm text-zinc-300">
            Decision colours appear only on the four outcomes and always carry their word, so they read without colour. Every
            text pairing in both themes meets WCAG AA contrast (4.5:1) or better. Signal Red stays under 5% of any screen.
          </p>
        </Section>

        <Section id="type" eyebrow="03 · Typography" title="One voice for people, one for machines">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-card">
              <p className="text-6xl font-bold tracking-tight text-zinc-50">Aa</p>
              <p className="mt-3 font-semibold text-zinc-50">Space Grotesk</p>
              <p className="text-sm text-zinc-300">Headlines, interface and body copy.</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-card">
              <p className="font-mono text-6xl font-medium text-red-400">{"{ }"}</p>
              <p className="mt-3 font-mono font-semibold text-zinc-50">JetBrains Mono</p>
              <p className="text-sm text-zinc-300">Labels, request IDs, hashes, traces and code.</p>
            </div>
          </div>
        </Section>

        <Section id="voice" eyebrow="04 · Voice" title="The calm guard">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              ["Precise, not technical", "Name the exact thing found. Skip the jargon around it."],
              ["Calm, not alarming", "A block is routine. Say what happened and what to do."],
              ["Plain, not clever", "Short sentences. One idea each."],
              ["Accountable, not vague", "Show the rule, the trace and the proof behind every call."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-card">
                <p className="font-semibold text-zinc-50">{t}</p>
                <p className="mt-1 text-sm text-zinc-300">{d}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.06] p-5">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">Say</p>
              <p className="mt-2 text-sm text-zinc-200">inspect · mask · hold · block · sent / not sent · trust boundary · reviewer · rotate the key</p>
            </div>
            <div className="rounded-2xl border border-red-500/40 bg-red-500/[0.06] p-5">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-red-300">Avoid</p>
              <p className="mt-2 text-sm text-zinc-200">military-grade · unhackable · 100% secure · AI magic · blaming the user</p>
            </div>
          </div>
        </Section>

        <Section id="assets" eyebrow="05 · Assets" title="Download the logo">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {ASSETS.map((a) => (
              <li key={a.file}>
                <a
                  href={a.file}
                  download
                  className={`flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 shadow-card transition-colors hover:border-zinc-700 hover:text-zinc-50 ${focusRing}`}
                >
                  <span className="min-w-0">{a.label}</span>
                  <Download className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </>
  );
}
