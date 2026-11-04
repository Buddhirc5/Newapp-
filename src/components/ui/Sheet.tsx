import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/lib/hooks";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

let openCount = 0;
function lockScroll() {
  openCount += 1;
  if (openCount === 1) document.documentElement.style.overflow = "hidden";
}
function unlockScroll() {
  openCount = Math.max(0, openCount - 1);
  if (openCount === 0) document.documentElement.style.overflow = "";
}

/** Keeps keyboard focus inside a modal, closes on Escape and restores focus when it closes. */
function useModalFocus(open: boolean, panel: RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    lockScroll();
    const frame = requestAnimationFrame(() => {
      const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current;
      first?.focus({ preventScroll: true });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      unlockScroll();
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, panel, onClose]);
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Short line under the title. */
  description?: ReactNode;
  children: ReactNode;
  /** Sticky footer, typically the primary action. */
  footer?: ReactNode;
  size?: "auto" | "tall";
  tone?: "default" | "night";
}

/**
 * Bottom sheet on phones (drag the grabber down to dismiss) and a centred form
 * sheet on wider screens, following the iOS sheet pattern.
 */
export function Sheet({ open, onClose, title, description, children, footer, size = "auto", tone = "default" }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const wide = useMediaQuery("(min-width: 768px)");
  const reduce = useReducedMotion();
  const drag = useDragControls();
  useModalFocus(open, panel, onClose);

  const night = tone === "night";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" data-sheet>
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={cn(
              "relative flex w-full max-w-[40rem] flex-col overflow-hidden outline-none",
              "rounded-t-sheet md:rounded-sheet",
              night ? "bg-night text-paper" : "bg-bg text-label",
              size === "tall" ? "h-[92dvh] md:h-[min(85dvh,52rem)]" : "max-h-[92dvh] md:max-h-[85dvh]",
              "shadow-float",
            )}
            style={{ paddingBottom: wide ? 0 : "env(safe-area-inset-bottom, 0px)" }}
            initial={reduce ? { opacity: 0 } : wide ? { opacity: 0, scale: 0.96 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : wide ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : wide ? { opacity: 0, scale: 0.96 } : { y: "100%" }}
            transition={reduce ? { duration: 0 } : { type: "spring", damping: 34, stiffness: 340, mass: 0.9 }}
            drag={wide || reduce ? false : "y"}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 700) onClose();
            }}
          >
            <header
              className="relative shrink-0 cursor-grab touch-none px-5 pt-2.5 pb-3 active:cursor-grabbing md:cursor-default md:pt-5"
              onPointerDown={(e) => {
                if (!wide && !(e.target as HTMLElement).closest("button")) drag.start(e);
              }}
            >
              <div className={cn("mx-auto mb-3 h-[5px] w-9 rounded-full md:hidden", night ? "bg-paper/30" : "bg-fill-3")} aria-hidden />
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 pt-1.5">
                  <h2 id={titleId} className="text-title3 font-bold">
                    {title}
                  </h2>
                  {description && (
                    <p id={descId} className={cn("mt-1 text-subhead", night ? "text-paper/70" : "text-label-2")}>
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className={cn("grid size-11 shrink-0 place-items-center rounded-full", night ? "bg-paper/10 hover:bg-paper/20" : "bg-fill-2 hover:bg-fill-3")}
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
            {footer && (
              <footer className={cn("shrink-0 border-t px-5 pt-3 pb-4", night ? "border-paper/10" : "border-sep bg-bg")}>{footer}</footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface AlertProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Centred alert for confirmations, styled after iOS alerts. */
export function AlertDialog({ open, title, message, confirmLabel, cancelLabel = "Cancel", destructive, onConfirm, onCancel }: AlertProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const msgId = useId();
  const reduce = useReducedMotion();
  useModalFocus(open, panel, onCancel);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-6">
          <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} aria-hidden />
          <motion.div
            ref={panel}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={msgId}
            tabIndex={-1}
            className="relative w-full max-w-[18.5rem] overflow-hidden rounded-[1.4rem] bg-surface text-center shadow-float outline-none"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
          >
            <div className="px-5 pt-5 pb-4">
              <h2 id={titleId} className="text-headline font-semibold">
                {title}
              </h2>
              <div id={msgId} className="mt-1.5 text-footnote text-label-2">
                {message}
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-sep">
              <button type="button" onClick={onCancel} className="min-h-12 border-r border-sep text-body text-teal-ink hover:bg-fill" data-autofocus>
                {cancelLabel}
              </button>
              <button type="button" onClick={onConfirm} className={cn("min-h-12 text-body font-semibold hover:bg-fill", destructive ? "text-coral-ink" : "text-teal-ink")}>
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
