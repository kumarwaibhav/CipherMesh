/**
 * The CipherMesh mark: an open hexagon of six mesh nodes (every model) around a red core
 * (the protected prompt), with one red path leaving through the open side (the inspected gate).
 * Ink follows `currentColor`; the core uses the brand colour.
 */
export function LogoMark({
  className = "h-8 w-8",
  simple = false,
  title,
}: {
  className?: string;
  /** Drop the spokes and nodes for sizes under 32 px. */
  simple?: boolean;
  title?: string;
}) {
  const a11y = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
  return (
    <svg viewBox="0 0 100 100" className={className} {...a11y}>
      {simple ? null : (
        <g stroke="currentColor" strokeWidth={2} opacity={0.4}>
          <line x1="50" y1="50" x2="50" y2="14" />
          <line x1="50" y1="50" x2="18.8" y2="32" />
          <line x1="50" y1="50" x2="18.8" y2="68" />
          <line x1="50" y1="50" x2="50" y2="86" />
          <line x1="50" y1="50" x2="81.2" y2="32" />
          <line x1="50" y1="50" x2="81.2" y2="68" />
        </g>
      )}
      <path
        d="M81.2 32 L50 14 L18.8 32 L18.8 68 L50 86 L81.2 68"
        fill="none"
        stroke="currentColor"
        strokeWidth={simple ? 8 : 6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <line x1="58" y1="50" x2="95" y2="50" className="stroke-brand" strokeWidth={simple ? 8 : 6} strokeLinecap="round" />
      {simple ? null : (
        <g fill="currentColor">
          <circle cx="50" cy="14" r="7" />
          <circle cx="18.8" cy="32" r="7" />
          <circle cx="18.8" cy="68" r="7" />
          <circle cx="50" cy="86" r="7" />
          <circle cx="81.2" cy="32" r="7" />
          <circle cx="81.2" cy="68" r="7" />
        </g>
      )}
      <circle cx="50" cy="50" r={simple ? 13 : 11} className="fill-brand" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-[0.06em] ${className}`}>
      CIPHER<span className="text-brand">MESH</span>
    </span>
  );
}
