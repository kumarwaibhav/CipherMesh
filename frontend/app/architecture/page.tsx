import type { Metadata } from "next";
import { Header } from "../components/Header";
import { ExternalLink } from "lucide-react";
import { MermaidSource } from "../components/MermaidSource";
import { focusRing } from "../components/ui";

export const metadata: Metadata = {
  title: "Architecture · CipherMesh",
  description: "CipherMesh control-plane architecture, LangGraph flow and request sequence.",
};

const DIAGRAMS = [
  {
    src: "/diagrams/architecture.svg",
    title: "System architecture",
    alt: "CipherMesh architecture: client applications send prompts to the CipherMesh gateway, which runs privacy inspection, vault isolation and utility routing before dispatching to AWS Bedrock, Azure AI, GCP Vertex AI or a local model.",
    caption: "Figure 1 — System architecture: the gateway sits between applications and every model provider.",
  },
  {
    src: "/diagrams/langgraph_flow.svg",
    title: "LangGraph flow",
    alt: "LangGraph state machine: privacy_inspection branches to vault_isolation, review hold or block, then to provider_dispatch and response inspection.",
    caption: "Figure 2 — LangGraph flow: each node is a checkpoint that can stop data before it leaves.",
  },
  {
    src: "/diagrams/request_sequence.svg",
    title: "Request sequence",
    alt: "Request sequence: client, gateway, detector, policy engine, vault, router and provider exchange messages for a single inspect call.",
    caption: "Figure 3 — Request sequence for a single /api/v1/inspect call.",
  },
] as const;

export default function ArchitecturePage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Architecture</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-400">
            How CipherMesh inspects, seals and routes every prompt before it reaches a model provider.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {DIAGRAMS.map((d) => (
            <figure key={d.src} className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-card">
              <div className="bg-white p-3 sm:p-4">
                {/* Below sm the diagram keeps a legible width and scrolls horizontally. */}
                <div
                  role="region"
                  aria-label={`${d.title} diagram, scrolls horizontally on small screens`}
                  tabIndex={0}
                  className={`scrollbar-thin overflow-x-auto rounded sm:overflow-visible ${focusRing}`}
                >
                  <a
                    href={d.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block min-w-[900px] rounded sm:min-w-0 ${focusRing}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.src}
                      alt={d.alt}
                      width={1600}
                      height={900}
                      loading="lazy"
                      style={{ width: "100%", height: "auto" }}
                    />
                  </a>
                </div>
              </div>
              <figcaption className="flex flex-col gap-2 border-t border-zinc-800 px-4 py-3 text-sm text-zinc-300 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">{d.caption}</span>
                <a
                  href={d.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex shrink-0 items-center gap-1 self-start rounded text-sm font-medium text-red-300 underline-offset-2 hover:text-red-200 hover:underline sm:self-auto ${focusRing}`}
                >
                  Open full size
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">: {d.title} (opens in a new tab)</span>
                </a>
              </figcaption>
            </figure>
          ))}
        </div>

        <MermaidSource />
      </main>
    </>
  );
}
