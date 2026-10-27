/**
 * The canvas behind everything: a quiet dot field and a few hair-thin streaks of light that drift
 * across it, like data moving through the mesh. Pure CSS transforms (compositor only), never
 * interactive, paused under Reduce Motion, and dim enough to sit behind any content.
 */
const STREAKS = [
  { top: "12%", delay: "0s", duration: "17s", width: "38vw" },
  { top: "34%", delay: "-6s", duration: "23s", width: "28vw" },
  { top: "58%", delay: "-11s", duration: "19s", width: "44vw" },
  { top: "76%", delay: "-3s", duration: "27s", width: "32vw" },
  { top: "90%", delay: "-15s", duration: "21s", width: "24vw" },
] as const;

export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop-dots" />
      <div className="backdrop-glow" />
      <div className="backdrop-streaks">
        {STREAKS.map((s) => (
          <span
            key={s.top}
            className="streak"
            style={{ top: s.top, width: s.width, animationDelay: s.delay, animationDuration: s.duration }}
          />
        ))}
      </div>
    </div>
  );
}
