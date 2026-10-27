"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Code2, Headset, Lightbulb, Loader2, Scale } from "lucide-react";
import { api, errorMessage, type TargetProvider } from "@/lib/api";
import { PENDING_EXAMPLE_KEY, RUN_EXAMPLE_EVENT, SAMPLES } from "@/lib/samples";
import { useSession } from "@/lib/session";
import { LargeTitle } from "./AppShell";
import { Checking, Details, PromptDocument, Verdict } from "./Result";
import { ReplyCard } from "./ResultPanels";
import { ErrorBanner, STATUS, buttonPlain, buttonPrimary, focusRing, smooth } from "./ui";
import { ProviderPicker } from "./ProviderPicker";
import { verdictCopy } from "@/lib/friendly";

const MAX_LEN = 65536;

const TEAM_ICON = { Engineering: Code2, "Customer-facing": Headset, "People & Legal": Scale, Product: Lightbulb } as const;

export function Checker() {
  const promptId = useId();
  const hintId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { busy, setBusy, last, record, clearLast, runs } = useSession();

  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<TargetProvider>("auto");
  const [error, setError] = useState<string | null>(null);
  const [allExamples, setAllExamples] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (text: string, target: TargetProvider) => {
      if (!text.trim() || text.length > MAX_LEN) return;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setBusy(true);
      setError(null);
      clearLast();
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: smooth(), block: "nearest" }));
      try {
        const res = await api.inspect({ prompt: text, target_provider: target }, controller.signal);
        if (controller.signal.aborted) return;
        record(res, text, `inspect --target ${target}`);
        requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: smooth(), block: "start" }));
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(errorMessage(err));
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    },
    [clearLast, record, setBusy],
  );

  const runSample = useCallback(
    (id: string) => {
      const s = SAMPLES.find((x) => x.id === id);
      if (!s) return;
      setPrompt(s.text);
      void run(s.text, provider);
    },
    [provider, run],
  );

  useEffect(() => {
    const onRun = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (id) runSample(id);
    };
    window.addEventListener(RUN_EXAMPLE_EVENT, onRun);
    try {
      const pending = window.sessionStorage.getItem(PENDING_EXAMPLE_KEY);
      if (pending) {
        window.sessionStorage.removeItem(PENDING_EXAMPLE_KEY);
        runSample(pending);
      }
    } catch {
      /* ignore */
    }
    return () => window.removeEventListener(RUN_EXAMPLE_EVENT, onRun);
  }, [runSample]);

  // Coming back to this screen restores the last prompt with its result.
  useEffect(() => {
    if (last?.original && !prompt) setPrompt(last.original);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tooLong = prompt.length > MAX_LEN;
  const canSubmit = !busy && prompt.trim().length > 0 && !tooLong;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canSubmit) void run(prompt, provider);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (canSubmit) void run(prompt, provider);
    }
  };
  const focusEditor = () => {
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: smooth(), block: "center" });
  };
  const reset = () => {
    setPrompt("");
    clearLast();
    setError(null);
    window.scrollTo({ top: 0, behavior: smooth() });
    window.setTimeout(() => textareaRef.current?.focus(), 250);
  };

  return (
    <main className="mx-auto flex max-w-[880px] flex-col gap-5 px-4 sm:px-6">
      <LargeTitle title="Check" subtitle="Paste what you’re about to send to an AI model. CipherMesh shows you exactly what it will receive." />

      <form onSubmit={onSubmit} className="surface rounded-2xl outline-2 outline-offset-2 outline-accent-text has-[textarea:focus]:outline" noValidate>
        <label htmlFor={promptId} className="sr-only">
          Text to check
        </label>
        <textarea
          id={promptId}
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKeyDown}
          rows={5}
          spellCheck={false}
          aria-describedby={hintId}
          aria-invalid={tooLong || undefined}
          placeholder="Summarize this email from priya@example.com about invoice 4471 and draft a reply."
          className="block min-h-[148px] w-full resize-y rounded-t-2xl bg-transparent px-5 pb-2 pt-4 text-[17px] leading-relaxed text-label placeholder:text-label-3 focus:outline-none"
        />
        <div className="sep flex items-center gap-3 border-t px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden shrink-0 whitespace-nowrap pl-1 text-[13px] text-label-2 sm:inline" aria-hidden="true">
              Send to
            </span>
            <ProviderPicker value={provider} onChange={setProvider} disabled={busy} />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span id={hintId} className={`text-[13px] ${tooLong ? "font-semibold text-block-text" : "hidden text-label-2 sm:inline"}`}>
              {tooLong ? `Too long: ${prompt.length.toLocaleString()} of ${MAX_LEN.toLocaleString()} characters` : "Ctrl + Enter"}
            </span>
            <button type="submit" disabled={!canSubmit} aria-busy={busy} className={`${buttonPrimary} ${focusRing}`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="h-4 w-4" aria-hidden="true" />}
              {busy ? "Checking…" : "Check"}
            </button>
          </div>
        </div>
      </form>

      <section aria-labelledby="examples-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
          <h2 id="examples-heading" className="text-[15px] font-semibold text-label">
            Try a Real-World Example
          </h2>
          <p className="text-[13px] text-label-2">What people paste into AI at work, and the mistake hiding in it</p>
        </div>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {(allExamples ? SAMPLES : SAMPLES.slice(0, 6)).map((s) => {
            const TeamIcon = TEAM_ICON[s.team];
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => runSample(s.id)}
                  disabled={busy}
                  className={`surface group flex h-full w-full flex-col items-start gap-1 rounded-2xl px-4 py-3.5 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-50 ${focusRing}`}
                >
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-label-2">
                    <TeamIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {s.role}
                  </span>
                  <span className="text-[16px] font-semibold text-label">{s.label}</span>
                  <span className="text-[13px] leading-snug text-label-2">{s.mistake}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {SAMPLES.length > 6 ? (
          <button type="button" onClick={() => setAllExamples((v) => !v)} className={`${buttonPlain} self-start ${focusRing}`}>
            {allExamples ? "Show Fewer" : `Show ${SAMPLES.length - 6} More Roles`}
          </button>
        ) : null}
      </section>

      <p role="status" className="sr-only">
        {busy ? "Checking…" : last ? `${STATUS[verdictCopy(last.result).tone].word}. ${verdictCopy(last.result).headline}` : ""}
      </p>
      <div ref={resultRef} className="flex scroll-mt-20 flex-col gap-4 pt-2 lg:scroll-mt-6">
        {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
        {busy ? <Checking /> : null}
        {!busy && last ? (
          <>
            <Verdict result={last.result} onEdit={focusEditor} onReset={reset} />
            <PromptDocument original={last.original} result={last.result} />
            {last.result.response ? <ReplyCard response={last.result.response} /> : null}
            <Details result={last.result} runs={runs} />
          </>
        ) : null}
      </div>
    </main>
  );
}
