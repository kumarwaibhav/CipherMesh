"use client";

import { useState, type KeyboardEvent } from "react";
import { AppWindow, Cloud, Cpu, ShieldCheck } from "lucide-react";
import { focusRing } from "./ui";

const LAYERS = [
  {
    id: "clients",
    n: 1,
    name: "Clients",
    Icon: AppWindow,
    tagline: "Anything that sends a prompt",
    points: [
      ["CipherMesh Console", "This web app: people check prompts, reviewers decide, everyone sees what left."],
      ["Any app or SDK", "Your chatbots, copilots and internal tools call one REST endpoint instead of a model API."],
      ["Agent-to-agent", "The same core runs as a signed TCP node, so other agents can submit work and policy updates."],
    ],
  },
  {
    id: "gateway",
    n: 2,
    name: "API Gateway",
    Icon: ShieldCheck,
    tagline: "The guard strip every request crosses",
    points: [
      ["Request IDs", "Every response carries X-Request-ID; a safe caller ID is reused so traces line up end to end."],
      ["Body cap, counted while streaming", "400 KB by default. Chunked uploads are counted byte by byte, so they can’t slip past the limit."],
      ["Per-client rate limit", "A sliding window (120 requests a minute by default) answers 429 with Retry-After."],
      ["Tokens, not sessions", "Optional API token for /inspect and a separate reviewer token for approvals. CORS never sends credentials."],
      ["Errors that never echo", "Validation errors list fields, never the submitted prompt. Security headers on every response."],
    ],
  },
  {
    id: "core",
    n: 3,
    name: "Agent Core",
    Icon: Cpu,
    tagline: "A LangGraph state machine: Inspect, Seal, Route, Act",
    points: [
      ["Inspect", "25 detectors plus de-obfuscation, then policy rules where the highest risk wins."],
      ["Seal", "The decision and evidence are encrypted into a verified envelope and written to the audit log."],
      ["Route", "A conditional edge picks one of three exits. Held content can never take the sending path."],
      ["Act", "Refuse, hold for a person, or procure, route and call a model, then inspect the reply."],
    ],
  },
  {
    id: "providers",
    n: 4,
    name: "Model Providers",
    Icon: Cloud,
    tagline: "Only safe or cleaned text crosses this line",
    points: [
      ["AWS Bedrock", "ap-south-1, Mumbai. Residency: India."],
      ["Azure AI Foundry", "Central India. Residency: India."],
      ["Google Vertex AI", "us-central1, Iowa. Excluded automatically when Indian personal data is present."],
      ["Private local model", "Ollama on your own hosts. The only destination for approved internal content."],
    ],
  },
] as const;

/**
 * The four layers as a selectable diagram: select a layer to read what it does. The trust boundary
 * encloses the gateway and the agent core; a packet travels the path to show direction of flow.
 */
export function ArchitectureExplorer() {
  const [active, setActive] = useState<(typeof LAYERS)[number]["id"]>("gateway");
  const layer = LAYERS.find((l) => l.id === active) ?? LAYERS[1];

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const j = (next + LAYERS.length) % LAYERS.length;
    setActive(LAYERS[j].id);
    document.getElementById(`layer-${LAYERS[j].id}`)?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="surface relative overflow-hidden rounded-3xl p-4 sm:p-6">
        <div className="relative grid gap-3 md:grid-cols-4" role="tablist" aria-label="Architecture layers">
          {/* trust boundary around gateway + core */}
          <div aria-hidden="true" className="pointer-events-none absolute -inset-y-2 left-[calc(25%-6px)] hidden w-[calc(50%+12px)] rounded-[22px] border border-dashed border-[rgb(var(--accent)/0.45)] md:block">
            <span className="absolute -top-2.5 left-4 bg-[rgb(var(--surface))] px-2 text-[11px] font-semibold text-accent-text">Your trust boundary</span>
          </div>
          {/* flow line */}
          <div aria-hidden="true" className="pointer-events-none absolute left-[12%] right-[12%] top-1/2 hidden h-px bg-[var(--separator)] md:block">
            <span className="flow-packet absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-accent shadow-[0_0_10px_rgb(var(--accent))]" />
          </div>
          {LAYERS.map((l, i) => {
            const on = l.id === active;
            return (
              <button
                key={l.id}
                id={`layer-${l.id}`}
                role="tab"
                type="button"
                aria-selected={on}
                aria-controls="layer-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(l.id)}
                onKeyDown={(e) => onKey(e, i)}
                className={`relative z-[1] flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition-[box-shadow,background-color,transform] duration-300 ${focusRing} ${
                  on ? "bg-[rgb(var(--surface))] shadow-raised ring-2 ring-accent" : "bg-[rgb(var(--surface-2))] hover:brightness-[1.03]"
                }`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${on ? "bg-accent text-white" : "bg-[rgb(var(--surface))] text-label-2"}`}>
                  <l.Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-[12px] text-label-2">Layer {l.n}</span>
                <span className="text-[17px] font-semibold text-label">{l.name}</span>
                <span className="text-[13px] leading-snug text-label-2">{l.tagline}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div id="layer-panel" role="tabpanel" aria-labelledby={`layer-${layer.id}`} className="surface rounded-3xl p-5 sm:p-7">
        <h3 className="text-[20px] font-semibold tracking-[-0.01em]">
          Layer {layer.n} · {layer.name}
        </h3>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {layer.points.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[15px] font-semibold text-label">{k}</dt>
              <dd className="mt-0.5 text-[15px] leading-relaxed text-label-2">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
