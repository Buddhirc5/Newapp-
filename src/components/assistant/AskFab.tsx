import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Maximize2, RotateCcw, Sparkles, X } from "lucide-react";
import { Link } from "react-router";
import { ChatThread, Composer } from "@/components/assistant/Chat";
import { useAssistant } from "@/lib/assistant";
import { tick } from "@/lib/haptics";

/** Floating "Ask KiwiPath" button on every app screen; opens the assistant in a panel. */
export function AskFab() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const a = useAssistant();
  const kb = useKeyboardInset(open);
  // Hidden where it would sit on top of a message box.
  if (pathname === "/assistant" || /^\/(chats|groups)\/./.test(pathname)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          tick();
          setOpen(true);
        }}
        aria-label="Ask KiwiPath"
        className="fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 inline-flex size-14 items-center justify-center gap-2 rounded-full bg-pink font-semibold lg:w-auto lg:pr-5 lg:pl-4 text-ink shadow-float ring-4 ring-bg transition-transform active:scale-95 lg:right-8 lg:bottom-8"
      >
        <Sparkles className="size-5" aria-hidden />
        <span className="hidden text-callout lg:inline">Ask</span>
        {a.busy && <span className="size-2 animate-pulse rounded-full bg-ink" aria-hidden />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-label="Ask KiwiPath"
              initial={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              style={kb.height ? { bottom: kb.bottom, maxHeight: kb.height - 8 } : undefined}
              className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[1.8rem] bg-bg shadow-float sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[26rem] sm:rounded-[1.8rem] lg:right-8 lg:bottom-8"
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            >
              <header className="flex items-center gap-2 border-b border-sep px-4 py-3">
                <span className="grid size-9 place-items-center rounded-full bg-pink text-ink">
                  <Sparkles className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-headline font-semibold">Ask KiwiPath</p>
                  <p className="text-caption text-label-2">Answers and set-up help</p>
                </div>
                {a.chat.length > 0 && (
                  <button type="button" onClick={a.clear} aria-label="New chat" title="New chat" className="grid size-10 place-items-center rounded-full hover:bg-fill">
                    <RotateCcw className="size-4" aria-hidden />
                  </button>
                )}
                <Link to="/assistant" onClick={() => setOpen(false)} aria-label="Open full screen" title="Full screen" className="grid size-10 place-items-center rounded-full hover:bg-fill">
                  <Maximize2 className="size-4" aria-hidden />
                </Link>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-10 place-items-center rounded-full hover:bg-fill">
                  <X className="size-5" aria-hidden />
                </button>
              </header>
              <div className="min-h-[16rem] flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                <ChatThread a={a} compact onNavigate={() => setOpen(false)} />
              </div>
              <div className="border-t border-sep px-3 pt-2" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
                <Composer a={a} autoFocus={!window.matchMedia("(pointer: coarse)").matches} />
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * When the on-screen keyboard opens, the visible area shrinks. Returns how far
 * to lift the panel and how tall it may be, so the question box stays visible.
 */
export function useKeyboardInset(active: boolean) {
  const [state, setState] = useState({ bottom: 0, height: 0 });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    const update = () => {
      const bottom = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      // Only adjust when a keyboard is actually open.
      setState(bottom > 80 ? { bottom, height: vv.height } : { bottom: 0, height: 0 });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);
  return state;
}
