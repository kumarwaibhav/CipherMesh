import { EyeOff } from "lucide-react";
import { categoryName } from "@/lib/friendly";

const TOKEN_RE = /\[REDACTED:[^\]\s]+\]/g;

/** Renders [REDACTED:EMAIL]-style tokens as friendly "hidden" pills. */
export function RedactedText({ text }: { text: string }) {
  const parts: Array<{ kind: "text" | "token"; value: string }> = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) parts.push({ kind: "text", value: text.slice(last, idx) });
    parts.push({ kind: "token", value: match[0] });
    last = idx + match[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });

  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === "text") return <span key={i}>{p.value}</span>;
        const raw = p.value.slice(10, -1).toLowerCase();
        return (
          <span
            key={i}
            title={`Hidden: ${p.value}`}
            className="mx-0.5 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-redact/15 px-2 py-px align-baseline font-sans text-[0.85em] font-semibold text-redact-text"
          >
            <EyeOff className="h-3 w-3" aria-hidden="true" />
            {categoryName(raw)} hidden
            <span className="sr-only"> ({p.value})</span>
          </span>
        );
      })}
    </>
  );
}
