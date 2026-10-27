import { categoryName } from "@/lib/friendly";

const TOKEN_RE = /\[REDACTED:[^\]\s]+\]/g;

/** Renders [REDACTED:EMAIL]-style tokens as the same redaction bars the result shows. */
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
        p.kind === "text" ? (
          <span key={i}>{p.value}</span>
        ) : (
          <span key={i} className="redaction" title={p.value}>
            {categoryName(p.value.slice(10, -1).toLowerCase())} hidden
            <span className="sr-only"> ({p.value})</span>
          </span>
        ),
      )}
    </>
  );
}
