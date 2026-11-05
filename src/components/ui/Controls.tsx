import { forwardRef, useId, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { motion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { tick } from "@/lib/haptics";

interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

/** iOS segmented control with a sliding thumb. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  label: string;
  className?: string;
  size?: "md" | "sm";
}) {
  const group = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex rounded-full bg-fill-2 p-1", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              if (!selected) tick();
              onChange(option.value);
            }}
            onKeyDown={(e) => {
              const index = options.findIndex((o) => o.value === value);
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                onChange(options[(index + 1) % options.length].value);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                onChange(options[(index - 1 + options.length) % options.length].value);
              }
            }}
            tabIndex={selected ? 0 : -1}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 font-semibold transition-colors",
              size === "sm" ? "min-h-9 text-footnote" : "min-h-10 text-subhead",
              selected ? "text-label" : "text-label-2 hover:text-label",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`${group}-thumb`}
                className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12),0_3px_8px_rgb(0_0_0/0.08)]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ checked, onChange, label, className }: { checked: boolean; onChange: (checked: boolean) => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        tick();
        onChange(!checked);
      }}
      className={cn("relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200", checked ? "bg-teal" : "bg-fill-3", className)}
    >
      <span
        className={cn(
          "absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] transition-transform duration-200 ease-ios",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

const FIELD = "w-full rounded-[0.9rem] bg-fill px-4 text-body text-label placeholder:text-label-3 outline-none ring-teal-ink/60 transition-shadow focus:bg-surface focus:ring-2";

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  id: string;
  children: ReactNode;
  className?: string;
  hideLabel?: boolean;
}

function FieldShell({ label, hint, id, children, className, hideLabel }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cn("px-1 text-subhead font-semibold text-label", hideLabel && "sr-only")}>
        {label}
      </label>
      {children}
      {hint && <p className="px-1 text-footnote text-label-2">{hint}</p>}
    </div>
  );
}

export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; hideLabel?: boolean; wrapClassName?: string }>(
  function TextField({ label, hint, hideLabel, id, className, wrapClassName, ...rest }, ref) {
    const auto = useId();
    const fieldId = id ?? auto;
    return (
      <FieldShell label={label} hint={hint} id={fieldId} hideLabel={hideLabel} className={wrapClassName}>
        <input ref={ref} id={fieldId} className={cn(FIELD, "min-h-12", className)} {...rest} />
      </FieldShell>
    );
  },
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode; hideLabel?: boolean; wrapClassName?: string }>(
  function TextArea({ label, hint, hideLabel, id, className, wrapClassName, ...rest }, ref) {
    const auto = useId();
    const fieldId = id ?? auto;
    return (
      <FieldShell label={label} hint={hint} id={fieldId} hideLabel={hideLabel} className={wrapClassName}>
        <textarea ref={ref} id={fieldId} className={cn(FIELD, "min-h-28 resize-y py-3 leading-relaxed", className)} {...rest} />
      </FieldShell>
    );
  },
);

export function Select({
  label,
  hint,
  id,
  className,
  wrapClassName,
  hideLabel,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: ReactNode; wrapClassName?: string; hideLabel?: boolean }) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell label={label} hint={hint} id={fieldId} className={wrapClassName} hideLabel={hideLabel}>
      <select id={fieldId} className={cn(FIELD, "min-h-12 appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10", className)} style={{ backgroundImage: "var(--chevron)" }} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, step = 1, label, format }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string; format?: (v: number) => string }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-fill-2 p-1" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => {
          tick();
          onChange(Math.max(min, value - step));
        }}
        className="grid size-9 place-items-center rounded-full hover:bg-surface disabled:opacity-30"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <output className="min-w-12 text-center text-callout font-semibold tabular" aria-live="polite">
        {format ? format(value) : value}
      </output>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => {
          tick();
          onChange(Math.min(max, value + step));
        }}
        className="grid size-9 place-items-center rounded-full hover:bg-surface disabled:opacity-30"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function Slider({ label, value, onChange, min, max, step, valueText, id }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; valueText?: string; id?: string }) {
  const auto = useId();
  const fieldId = id ?? auto;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="sr-only">
        {label}
      </label>
      <input
        id={fieldId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText}
        onChange={(e) => onChange(Number(e.target.value))}
        className="kp-range h-11 w-full cursor-pointer appearance-none bg-transparent"
        style={{ "--pct": `${pct}%` } as CSSProperties}
      />
    </div>
  );
}
