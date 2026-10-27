"use client";

import { useEffect, useState } from "react";

const NODES: Array<[number, number]> = [
  [50, 14],
  [81.2, 32],
  [81.2, 68],
  [50, 86],
  [18.8, 68],
  [18.8, 32],
];

/**
 * The CipherMesh mark: an open hexagon of six mesh nodes (every model) around a core (the protected
 * prompt), with one red path leaving through the open side (the inspected gate). Red is kept to the
 * gate so it never competes with the Blocked status; the core turns blue only while a check runs.
 *
 * Motion carries meaning only: it draws itself once per visit, and the core breathes while a
 * check is running. Reduced Motion shows the finished mark.
 */
export function LogoMark({
  className = "h-8 w-8",
  draw = false,
  busy = false,
  simple = false,
  title,
}: {
  className?: string;
  draw?: boolean;
  busy?: boolean;
  simple?: boolean;
  title?: string;
}) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!draw) return;
    try {
      if (window.sessionStorage.getItem("cm-mark-drawn") === "1") return;
      window.sessionStorage.setItem("cm-mark-drawn", "1");
    } catch {
      /* draw anyway */
    }
    setAnimate(true);
  }, [draw]);

  const a11y = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
  const cls = `${className} ${animate ? "mark-draw" : ""} ${busy ? "mark-busy" : ""}`;
  return (
    <svg viewBox="0 0 100 100" className={cls} {...a11y}>
      {simple ? null : (
        <g stroke="currentColor" strokeWidth={2.2} opacity={0.32}>
          {NODES.map(([x, y]) => (
            <line key={`${x}-${y}`} x1="50" y1="50" x2={x} y2={y} />
          ))}
        </g>
      )}
      <path
        className="mark-hex"
        d="M81.2 32 L50 14 L18.8 32 L18.8 68 L50 86 L81.2 68"
        fill="none"
        stroke="currentColor"
        strokeWidth={simple ? 8 : 6.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <line className="mark-gate stroke-brand" x1="58" y1="50" x2="95" y2="50" strokeWidth={simple ? 8 : 6.5} strokeLinecap="round" />
      {simple ? null : (
        <g fill="currentColor">
          {NODES.map(([x, y], i) => (
            <circle key={`n-${x}-${y}`} className="mark-node" style={{ animationDelay: `${180 + i * 90}ms` }} cx={x} cy={y} r="7" />
          ))}
        </g>
      )}
      <circle className={`mark-core transition-[fill] duration-300 ${busy ? "fill-accent" : "fill-current"}`} cx="50" cy="50" r={simple ? 13 : 11} />
    </svg>
  );
}
