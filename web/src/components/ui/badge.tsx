import * as React from "react";

export type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "info"
  | "primary";

export function Badge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  const variantStyles: Record<BadgeVariant, string> = {
    neutral:
      "bg-[var(--color-surface-elevated)] text-[var(--color-text)] border border-[var(--color-border)]",
    success:
      "bg-[var(--color-success-soft)] text-[var(--color-success)] border border-[var(--color-success)]/20",
    warning:
      "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border border-[var(--color-warning)]/20",
    info: "bg-[var(--color-secondary-soft)] text-[var(--color-secondary)] border border-[var(--color-secondary)]/20",
    primary:
      "bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/20",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
        variantStyles[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
