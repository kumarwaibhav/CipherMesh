import { Lock } from "lucide-react";

const TOKEN_RE = /\[REDACTED:[^\]\s]+\]/g;

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
      {parts.map((p, i) =>
        p.kind === "token" ? (
          <span
            key={i}
            className="mx-0.5 inline-flex items-center gap-1 whitespace-nowrap rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-px align-baseline font-mono text-[0.8em] font-semibold text-amber-200"
          >
            <Lock className="h-3 w-3" aria-hidden="true" />
            {p.value.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </>
  );
}
