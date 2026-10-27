"use client";

import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { focusRing } from "./ui";

/**
 * An iOS-style sheet on the native <dialog>: focus trap, Esc and backdrop close it. On phones it rises
 * from the bottom with a grabber and can be swiped down; on larger screens it is a centred card.
 * Sheets whose body already has Cancel or Done pass `hideClose` so there is one way out, not three.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  hideClose = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  hideClose?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const drag = useRef<{ y: number; id: number } | null>(null);
  const [dy, setDy] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
    if (!open) setDy(0);
  }, [open]);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { y: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    setDy(Math.max(0, e.clientY - drag.current.y));
  };
  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    if (dy > 90) onClose();
    else setDy(0);
  };

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass max-h-[92dvh] overflow-y-auto rounded-t-[26px] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2 text-label [--glass-a:0.96] sm:max-h-[85vh] sm:rounded-[26px] sm:p-7"
        style={dy ? { transform: `translateY(${dy}px)`, transition: "none" } : { transition: "transform 240ms cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div
          className="-mx-5 flex h-6 cursor-grab touch-none items-center justify-center sm:hidden"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          aria-hidden="true"
        >
          <span className="h-[5px] w-9 rounded-full bg-[rgb(var(--label-3)/0.5)]" />
        </div>
        <div className="mb-5 mt-1 flex items-start justify-between gap-4 sm:mt-0">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[22px] font-bold tracking-[-0.02em]">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-[15px] text-label-2">{subtitle}</p> : null}
          </div>
          {hideClose ? null : (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={`fill inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-label-2 hover:text-label sm:h-8 sm:w-8 ${focusRing}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {open ? children : null}
      </div>
    </dialog>
  );
}
