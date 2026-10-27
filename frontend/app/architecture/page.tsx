import type { Metadata } from "next";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { LargeTitle } from "../components/AppShell";
import { MermaidSource } from "../components/MermaidSource";
import { STATUS, focusRing } from "../components/ui";

export const metadata: Metadata = {
  title: "How It Works",
  description: "How CipherMesh checks, seals and routes every prompt before it reaches an AI model.",
};

const STEPS = [
  ["Look", "Your text is scanned for 25 kinds of secrets and personal details. Aadhaar and card numbers are verified with their checksums, not guessed."],
  ["Lock Away", "The original is encrypted and stored, so it can be audited later without anyone reading it in plain form."],
  ["Decide", "The strictest rule wins: a secret is stopped, an internal link waits for a person, personal details are hidden, and everything else is sent as written."],
  ["Send Safely", "Only safe or cleaned text leaves, to the model with the best balance of privacy, quality, cost and speed. The reply is checked on the way back."],
] as const;

const OUTCOMES = [
  ["ALLOW", "Nothing private was found. The text is sent exactly as written."],
  ["REDACT", "Emails, phone numbers, ID numbers and card numbers are hidden before sending."],
  ["REVIEW", "Internal links wait for a reviewer. If approved, only a private model inside the company sees them."],
  ["BLOCK", "Passwords and keys are never sent. You’re asked to change the key."],
] as const;

const DIAGRAMS = [
  {
    src: "/diagrams/architecture.svg",
    title: "The Big Picture",
    alt: "CipherMesh architecture: applications send prompts to the CipherMesh gateway, which inspects, seals and routes them before any AI provider sees them.",
    caption: "CipherMesh sits between your apps and every AI provider. Only safe or cleaned text crosses the red line.",
  },
  {
    src: "/diagrams/langgraph_flow.svg",
    title: "The Decision Path",
    alt: "Agent flow: inspection, then the vault, then one of three exits: block, hold for review, or send to a provider.",
    caption: "Every prompt follows the same path and leaves through exactly one of three exits.",
  },
  {
    src: "/diagrams/request_sequence.svg",
    title: "One Request, Start to Finish",
    alt: "Sequence of a single check: web app, gateway, detector, policy, vault, router and provider.",
    caption: "What happens in the half-second after you press Check.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <main className="mx-auto flex max-w-[880px] flex-col gap-8 px-4 sm:px-6">
      <LargeTitle title="How It Works" subtitle="A privacy checkpoint for AI. Every prompt passes four steps in well under a second, before any AI company sees it." />

      <section aria-labelledby="steps" className="flex flex-col gap-2.5">
        <h2 id="steps" className="px-1 text-[15px] font-semibold text-label-2">
          Four Steps
        </h2>
        <ol className="surface divide-y divide-[var(--separator)] overflow-hidden rounded-2xl">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex gap-4 px-5 py-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center fill rounded-full text-[13px] font-semibold text-label" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h3 className="text-[17px] font-semibold">
                  <span className="sr-only">Step {i + 1}: </span>
                  {title}
                </h3>
                <p className="mt-0.5 text-[15px] leading-relaxed text-label-2">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="outcomes" className="flex flex-col gap-2.5">
        <h2 id="outcomes" className="px-1 text-[15px] font-semibold text-label-2">
          Four Results
        </h2>
        <ul className="surface divide-y divide-[var(--separator)] overflow-hidden rounded-2xl">
          {OUTCOMES.map(([d, text]) => {
            const s = STATUS[d];
            return (
              <li key={d} className="flex items-start gap-4 px-5 py-4">
                <s.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.text}`} aria-hidden="true" />
                <div>
                  <h3 className={`text-[17px] font-semibold ${s.text}`}>{s.word}</h3>
                  <p className="mt-0.5 text-[15px] leading-relaxed text-label-2">{text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="diagrams" className="flex flex-col gap-2.5">
        <h2 id="diagrams" className="px-1 text-[15px] font-semibold text-label-2">
          Diagrams
        </h2>
        {DIAGRAMS.map((d) => (
          <figure key={d.src} className="surface min-w-0 overflow-hidden rounded-2xl">
            <figcaption className="flex flex-col gap-1 px-5 pt-4 sm:flex-row sm:items-start sm:justify-between">
              <span>
                <span className="block text-[17px] font-semibold">{d.title}</span>
                <span className="block text-[15px] text-label-2">{d.caption}</span>
              </span>
              <a
                href={d.src}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-1 self-start rounded-full px-3 text-[15px] font-semibold text-accent-text hover:bg-accent/10 ${focusRing}`}
              >
                Full Size
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">: {d.title} (opens in a new tab)</span>
              </a>
            </figcaption>
            <div className="p-3">
              <div
                role="region"
                aria-label={`${d.title} diagram, scrolls sideways on small screens`}
                tabIndex={0}
                className={`scrollbar-thin overflow-x-auto rounded-xl bg-white p-2 sm:overflow-visible ${focusRing}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.src} alt={d.alt} width={1600} height={900} loading="lazy" className="min-w-[860px] sm:min-w-0" style={{ width: "100%", height: "auto" }} />
              </div>
            </div>
          </figure>
        ))}
      </section>

      <details className="surface group rounded-2xl">
        <summary className={`flex min-h-[52px] cursor-pointer list-none items-center gap-3 rounded-2xl px-5 py-3 ${focusRing} [&::-webkit-details-marker]:hidden`}>
          <ChevronRight className="h-4 w-4 shrink-0 text-label-2 transition-transform duration-200 group-open:rotate-90" aria-hidden="true" />
          <span className="flex-1 text-[15px] font-semibold">For Engineers</span>
          <span className="hidden text-[13px] text-label-2 sm:inline">The live agent graph from the running server</span>
        </summary>
        <div className="sep border-t p-3">
          <MermaidSource />
        </div>
      </details>
    </main>
  );
}
