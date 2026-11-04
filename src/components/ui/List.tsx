import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { tick } from "@/lib/haptics";

/** iOS-style inset grouped list. */
export function ListGroup({ header, footer, children, className }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-1.5", className)}>
      {header && <h3 className="px-4 text-footnote font-semibold tracking-wide text-label-2 uppercase">{header}</h3>}
      <ul className="overflow-hidden rounded-tile bg-surface shadow-card">{children}</ul>
      {footer && <p className="px-4 text-footnote text-label-2">{footer}</p>}
    </section>
  );
}

interface RowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  value?: ReactNode;
  accessory?: "chevron" | "external" | ReactNode;
  to?: string;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function ListRow({ title, subtitle, icon, value, accessory, to, href, onClick, destructive, className, ariaLabel }: RowProps) {
  const trailing =
    accessory === "chevron" ? (
      <ChevronRight className="size-5 shrink-0 text-label-3" aria-hidden />
    ) : accessory === "external" ? (
      <ExternalLink className="size-[1.1rem] shrink-0 text-label-3" aria-hidden />
    ) : (
      accessory
    );

  const inner = (
    <>
      {icon && <span className="py-2.5 pl-4">{icon}</span>}
      <span className={cn("flex min-h-[3.25rem] min-w-0 flex-1 items-center gap-3 border-b border-sep py-2.5 pr-4 group-last:border-b-0", !icon && "pl-4")}>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-body", destructive ? "text-coral-ink" : "text-label")}>{title}</span>
          {subtitle && <span className="mt-0.5 block text-subhead text-label-2">{subtitle}</span>}
        </span>
        {value !== undefined && <span className="shrink-0 text-body text-label-2 tabular">{value}</span>}
        {trailing}
      </span>
    </>
  );

  const interactive = "flex w-full items-center gap-3 text-left transition-colors hover:bg-fill active:bg-fill-2";
  return (
    <li className={cn("group", className)}>
      {to ? (
        <Link to={to} className={interactive} aria-label={ariaLabel} onClick={() => tick()}>
          {inner}
        </Link>
      ) : href ? (
        <a href={href} target="_blank" rel="noreferrer" className={interactive} aria-label={ariaLabel}>
          {inner}
        </a>
      ) : onClick ? (
        <button
          type="button"
          className={interactive}
          aria-label={ariaLabel}
          onClick={() => {
            tick();
            onClick();
          }}
        >
          {inner}
        </button>
      ) : (
        <div className="flex items-center gap-3">{inner}</div>
      )}
    </li>
  );
}
