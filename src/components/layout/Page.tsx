import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

interface PageProps {
  title: string;
  /** Shown under the large title. */
  lead?: ReactNode;
  /** Parent screen for the back button, e.g. { to: "/tools", label: "Tools" }. */
  back?: { to: string; label: string };
  actions?: ReactNode;
  children: ReactNode;
  /** Replaces the large title block, for screens with their own hero. */
  hero?: ReactNode;
  className?: string;
  wide?: boolean;
}

/**
 * Screen scaffold following the iOS navigation bar: a large title that scrolls
 * away, and a compact title that fades into a translucent bar once it has.
 */
export function Page({ title, lead, back, actions, children, hero, className, wide }: PageProps) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), { rootMargin: "-56px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.title = title === "KiwiPath" ? "KiwiPath" : `${title} · KiwiPath`;
  }, [title]);

  return (
    <div className={cn("relative", className)}>
      <header
        className={cn(
          "sticky z-30 transition-[background-color,box-shadow] duration-200 gutter-x",
          // Top-level screens have no back button: the bar overlays the page instead of leaving an empty gap.
          !back && !actions && "-mb-14",
          !back && !actions && !scrolled && "pointer-events-none",
          scrolled ? "bg-material shadow-[0_0.5px_0_var(--sep)] backdrop-blur-xl backdrop-saturate-150" : "bg-transparent",
        )}
        style={{ top: "env(safe-area-inset-top, 0px)" }}
      >
        <div className={cn("relative mx-auto flex h-14 items-center gap-2", wide ? "max-w-5xl" : "max-w-2xl")}>
          <div className="flex min-w-0 flex-1 items-center">
            {back && (
              <Link
                to={back.to}
                className="-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-full pr-3 pl-1 text-body text-teal-ink hover:bg-fill"
                aria-label={`Back to ${back.label}`}
              >
                <ChevronLeft className="size-7" strokeWidth={2.4} aria-hidden />
                <span className="max-w-[9rem] truncate">{back.label}</span>
              </Link>
            )}
          </div>
          <p
            className={cn(
              "pointer-events-none absolute left-1/2 max-w-[55%] -translate-x-1/2 truncate text-headline font-semibold transition-opacity duration-200",
              scrolled ? "opacity-100" : "opacity-0",
            )}
            aria-hidden={!scrolled}
          >
            {title}
          </p>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </div>
      </header>

      <div className="gutter-x">
        <div className={cn("mx-auto pb-36 lg:pb-16", wide ? "max-w-5xl" : "max-w-2xl")}>
          {hero ?? (
            <div className={cn("pb-5", !back && !actions ? "pt-4" : "pt-1")}>
              <h1 className="type-display text-large-title">{title}</h1>
              {lead && <div className="mt-2 max-w-[38rem] text-callout text-label-2">{lead}</div>}
            </div>
          )}
          <div ref={sentinel} aria-hidden className="h-px" />
          {children}
        </div>
      </div>
    </div>
  );
}
