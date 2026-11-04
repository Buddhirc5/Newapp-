import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { cn } from "@/lib/cn";
import { tick } from "@/lib/haptics";

export type ButtonVariant = "primary" | "dark" | "tinted" | "outline" | "plain" | "destructive" | "light";
export type ButtonSize = "lg" | "md" | "sm";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-teal-ink text-white hover:brightness-110 active:brightness-95 shadow-[0_1px_0_rgb(255_255_255/0.2)_inset]",
  dark: "bg-night text-paper hover:bg-night-2",
  tinted: "bg-fill-2 text-label hover:bg-fill-3",
  outline: "bg-surface text-label ring-1 ring-inset ring-label/80 hover:bg-fill",
  plain: "bg-transparent text-teal-ink hover:bg-fill",
  destructive: "bg-coral-soft text-coral-ink hover:brightness-95",
  light: "bg-white text-ink hover:bg-white/90",
};

// Every size keeps a 44pt minimum hit target (Apple HIG).
const SIZES: Record<ButtonSize, string> = {
  lg: "min-h-[3.25rem] px-6 text-headline font-semibold gap-2.5",
  md: "min-h-11 px-5 text-callout font-semibold gap-2",
  sm: "min-h-11 px-4 text-subhead font-semibold gap-1.5",
};

const BASE =
  "inline-flex select-none items-center justify-center rounded-full text-center transition-[filter,background-color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100";

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconAfter?: ReactNode;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, CommonProps & ButtonHTMLAttributes<HTMLButtonElement>>(function Button(
  { variant = "primary", size = "lg", icon, iconAfter, block, className, children, onClick, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], block && "w-full", className)}
      onClick={(e) => {
        tick();
        onClick?.(e);
      }}
      {...rest}
    >
      {icon}
      <span className="min-w-0">{children}</span>
      {iconAfter}
    </button>
  );
});

export function ButtonLink({
  variant = "primary",
  size = "lg",
  icon,
  iconAfter,
  block,
  className,
  children,
  ...rest
}: CommonProps & LinkProps) {
  return (
    <Link className={cn(BASE, VARIANTS[variant], SIZES[size], block && "w-full", className)} {...rest}>
      {icon}
      <span className="min-w-0">{children}</span>
      {iconAfter}
    </Link>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: "surface" | "tinted" | "dark" | "plain";
  size?: "md" | "lg";
}

const ICON_VARIANTS = {
  surface: "bg-surface text-label shadow-card hover:bg-surface-2",
  tinted: "bg-fill-2 text-label hover:bg-fill-3",
  dark: "bg-night text-paper hover:bg-night-2",
  plain: "bg-transparent text-label hover:bg-fill",
};

/** Circular icon button with an accessible name and a 44pt hit target. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = "surface", size = "md", className, children, onClick, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-transform duration-150 active:scale-95 disabled:opacity-40 motion-reduce:active:scale-100",
        size === "lg" ? "size-14" : "size-11",
        ICON_VARIANTS[variant],
        className,
      )}
      onClick={(e) => {
        tick();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
});
