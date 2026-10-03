import { type LucideIcon } from "lucide-react";
import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: LucideIcon;
};

export function Input({
  label,
  helperText,
  error,
  className = "",
  icon: Icon,
  ...props
}: InputProps) {
  const fieldId = React.useId();

  return (
    <div className="flex w-full flex-col gap-2">
      {label ? (
        <label
          htmlFor={fieldId}
          className="text-sm font-medium text-[var(--color-text)]"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        {Icon ? (
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--color-text-muted)]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        ) : null}
        <input
          id={fieldId}
          className={[
            "h-12 w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] transition-colors duration-200 placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40",
            Icon ? "pl-10" : "",
            error
              ? "border-[var(--color-error)]"
              : "border-[var(--color-border)]",
            className,
          ].join(" ")}
          {...props}
        />
      </div>
      {helperText && !error ? (
        <p className="text-xs text-[var(--color-text-muted)]">{helperText}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-[var(--color-error)]">{error}</p>
      ) : null}
    </div>
  );
}
