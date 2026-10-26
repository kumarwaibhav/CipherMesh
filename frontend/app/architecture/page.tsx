import type { Metadata } from "next";
import { ArrowUpRight, Ban, CheckCircle2, ChevronDown, Clock, EyeOff, Lock, Route, ScanSearch, ShieldCheck } from "lucide-react";
import { MermaidSource } from "../components/MermaidSource";
import { focusRing } from "../components/ui";

export const metadata: Metadata = {
  title: "How it works",
  description: "How CipherMesh checks, seals and routes every prompt before it reaches an AI model.",
};

const STEPS = [
  {
    Icon: ScanSearch,
    title: "1. Look",
    text: "Your text is scanned for 25 kinds of secrets and personal details. Numbers like Aadhaar and card numbers are verified, not guessed.",
  },
  {
    Icon: Lock,
    title: "2. Lock away",
    text: "The original is encrypted and stored, so it can be audited later without anyone reading it in plain form.",
  },
  {
    Icon: ShieldCheck,
    title: "3. Decide",
    text: "The strictest rule wins: a secret blocks, an internal link waits for a person, personal data is hidden, everything else is safe.",
  },
  {
    Icon: Route,
    title: "4. Send safely",
    text: "Only safe or cleaned text goes out, to the model with the best balance of privacy, quality, cost and speed. The reply is checked too.",
  },
] as const;

const OUTCOMES = [
  { Icon: CheckCircle2, name: "Safe", color: "bg-allow", text: "text-allow-text", what: "Nothing private found. Sent exactly as written." },
  { Icon: EyeOff, name: "Cleaned", color: "bg-redact", text: "text-redact-text", what: "Emails, phone numbers, IDs and card numbers are hidden before sending." },
  { Icon: Clock, name: "Waiting", color: "bg-review", text: "text-review-text", what: "Internal links wait for a reviewer. If approved, only a private model sees them." },
  { Icon: Ban, name: "Blocked", color: "bg-block", text: "text-block-text", what: "Passwords and keys are never sent. You’re told to change the key." },
] as const;

const DIAGRAMS = [
  {
    src: "/diagrams/architecture.svg",
    title: "The big picture",
    alt: "CipherMesh architecture: applications send prompts to the CipherMesh gateway, which inspects, seals and routes them before any AI provider sees them.",
    caption: "CipherMesh sits between your apps and every AI provider. Only safe or cleaned text crosses the red line.",
  },
  {
    src: "/diagrams/langgraph_flow.svg",
    title: "The decision path",
    alt: "Agent flow: inspection, then the vault, then one of three exits: block, hold for review, or send to a provider.",
    caption: "Every prompt follows the same path and leaves through exactly one of three exits.",
  },
  {
    src: "/diagrams/request_sequence.svg",
    title: "One request, start to finish",
    alt: "Sequence of a single check: console, gateway, detector, policy, vault, router and provider.",
    caption: "What happens in the half-second after you press Check prompt.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-10 px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-[34px] font-semibold tracking-tight sm:text-5xl">How CipherMesh works</h1>
        <p className="max-w-2xl text-[17px] text-label-2 sm:text-lg">
          A privacy checkpoint for AI. Every prompt passes four steps in well under a second, before any AI company sees it.
        </p>
      </div>

      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ Icon, title, text }) => (
          <li key={title} className="glass flex flex-col gap-3 rounded-3xl p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tint text-white shadow-[0_6px_16px_-6px_rgb(0_113_227/0.7)]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="text-[17px] font-semibold">{title}</h2>
            <p className="text-[15px] leading-relaxed text-label-2">{text}</p>
          </li>
        ))}
      </ol>

      <section aria-labelledby="outcomes" className="flex flex-col gap-4">
        <h2 id="outcomes" className="text-2xl font-semibold tracking-tight">
          The four results
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {OUTCOMES.map(({ Icon, name, color, text, what }) => (
            <li key={name} className="glass flex items-start gap-4 rounded-3xl p-5">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${color} text-white`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className={`text-[17px] font-semibold ${text}`}>{name}</p>
                <p className="mt-0.5 text-[15px] text-label-2">{what}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="diagrams" className="flex flex-col gap-4">
        <h2 id="diagrams" className="text-2xl font-semibold tracking-tight">
          Diagrams
        </h2>
        {DIAGRAMS.map((d) => (
          <figure key={d.src} className="glass min-w-0 overflow-hidden rounded-3xl">
            <figcaption className="flex flex-col gap-1 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="block text-[17px] font-semibold">{d.title}</span>
                <span className="block text-[15px] text-label-2">{d.caption}</span>
              </span>
              <a
                href={d.src}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex shrink-0 items-center gap-1 self-start rounded-full px-3 py-1.5 text-sm font-semibold text-tint-text hover:bg-tint/10 sm:self-auto ${focusRing}`}
              >
                Full size
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">: {d.title} (opens in a new tab)</span>
              </a>
            </figcaption>
            <div className="p-3 sm:p-4">
              <div
                role="region"
                aria-label={`${d.title} diagram, scrolls sideways on small screens`}
                tabIndex={0}
                className={`scrollbar-thin overflow-x-auto rounded-2xl bg-white p-2 sm:overflow-visible ${focusRing}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.src}
                  alt={d.alt}
                  width={1600}
                  height={900}
                  loading="lazy"
                  className="min-w-[860px] sm:min-w-0"
                  style={{ width: "100%", height: "auto" }}
                />
              </div>
            </div>
          </figure>
        ))}
      </section>

      <details className="group">
        <summary className={`glass flex cursor-pointer list-none items-center justify-between gap-3 rounded-3xl px-5 py-4 ${focusRing} [&::-webkit-details-marker]:hidden`}>
          <span>
            <span className="block text-[15px] font-semibold">For engineers</span>
            <span className="block text-sm text-label-2">The live agent graph, generated by the running server</span>
          </span>
          <ChevronDown className="h-5 w-5 text-label-2 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="mt-4">
          <MermaidSource />
        </div>
      </details>
    </main>
  );
}
