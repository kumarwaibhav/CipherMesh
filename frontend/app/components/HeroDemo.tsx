"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Ban, CheckCircle2, EyeOff, Loader2 } from "lucide-react";
import { LogoMark } from "./Logo";

type Part = string | { value: string; label: string };

const SCENES: ReadonlyArray<{
  who: string;
  parts: Part[];
  outcome: "REDACT" | "BLOCK" | "ALLOW";
  route: string;
}> = [
  {
    who: "Support agent · drafting a refund reply",
    parts: [
      "Refund the duplicate charge for ",
      { value: "ananya.rao@example.com", label: "Email hidden" },
      ", card ",
      { value: "4111 1111 1111 1111", label: "Card hidden" },
      ", and confirm by SMS to ",
      { value: "+91 98450 12345", label: "Phone hidden" },
      ".",
    ],
    outcome: "REDACT",
    route: "AWS Bedrock · Mumbai",
  },
  {
    who: "Backend engineer · debugging a deploy",
    parts: ["Why does auth fail? ", { value: "DATABASE_URL=postgres://app:S3cure!@db-prod…", label: "Credential" }, " in production."],
    outcome: "BLOCK",
    route: "Nothing sent",
  },
  {
    who: "Product manager · writing a PRD",
    parts: ["Outline a PRD for passkey sign-in: goals, user stories, success metrics and open questions."],
    outcome: "ALLOW",
    route: "GCP Vertex AI · best value",
  },
];

const OUTCOME = {
  REDACT: { word: "Cleaned", Icon: EyeOff, cls: "text-redact-text" },
  BLOCK: { word: "Blocked", Icon: Ban, cls: "text-block-text" },
  ALLOW: { word: "Safe", Icon: CheckCircle2, cls: "text-allow-text" },
} as const;

/**
 * The hero's living proof: a prompt arrives, CipherMesh checks it, and the private values are swept
 * out before the request leaves. It cycles through three real situations; Reduce Motion holds the
 * finished state of the first one.
 */
export function HeroDemo() {
  const [scene, setScene] = useState(0);
  const [phase, setPhase] = useState<"typing" | "checking" | "done">("done");
  const [still, setStill] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setStill(Boolean(reduce));
    if (reduce) return;
    let i = 0;
    const timers: number[] = [];
    const play = () => {
      setScene(i % SCENES.length);
      setPhase("typing");
      timers.push(window.setTimeout(() => setPhase("checking"), 900));
      timers.push(window.setTimeout(() => setPhase("done"), 1700));
      timers.push(window.setTimeout(() => {
        i += 1;
        play();
      }, 6200));
    };
    play();
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const s = SCENES[scene];
  const o = OUTCOME[s.outcome];
  const done = phase === "done";

  return (
    <figure aria-label="Example: CipherMesh checking prompts" className="surface relative mx-auto w-full max-w-[560px] overflow-hidden rounded-[28px] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] font-medium text-label-2">
          <LogoMark busy={phase === "checking"} className="h-6 w-6 text-label" />
          {s.who}
        </span>
        <span className={`flex items-center gap-1.5 text-[13px] font-semibold transition-opacity duration-300 ${done ? o.cls : "text-label-2"}`}>
          {done ? <o.Icon className="h-4 w-4" aria-hidden="true" /> : <Loader2 className={`h-4 w-4 ${still ? "" : "animate-spin"}`} aria-hidden="true" />}
          {done ? o.word : phase === "checking" ? "Checking…" : "Received"}
        </span>
      </div>

      <p key={scene} className={`mt-4 min-h-[112px] font-mono text-[14px] leading-7 text-label transition-opacity duration-500 sm:text-[15px] ${phase === "typing" ? "opacity-70" : "opacity-100"}`}>
        {s.parts.map((p, i) =>
          typeof p === "string" ? (
            <span key={i}>{p}</span>
          ) : s.outcome === "BLOCK" ? (
            <span key={i} className={`rounded px-0.5 transition-colors duration-500 ${done ? "bg-block/15 text-block-text line-through decoration-2" : ""}`}>
              {p.value}
            </span>
          ) : done ? (
            <span key={`${scene}-${i}`} className="redaction" data-sweep={!still} style={{ ["--delay" as string]: `${120 + i * 110}ms` }}>
              <span className="redaction-orig" aria-hidden="true">
                {p.value}
              </span>
              <span className="redaction-label">{p.label}</span>
            </span>
          ) : (
            <span key={i} className="underline decoration-redact decoration-2 underline-offset-4">
              {p.value}
            </span>
          ),
        )}
      </p>

      <div className="sep mt-4 flex items-center justify-between gap-3 border-t pt-4 text-[13px]">
        <span className="text-label-2">Leaves your network</span>
        <span className={`flex items-center gap-1.5 font-semibold transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"} ${s.outcome === "BLOCK" ? "text-block-text" : "text-label"}`}>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          {s.route}
        </span>
      </div>
    </figure>
  );
}
