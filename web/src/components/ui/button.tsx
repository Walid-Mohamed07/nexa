import { LoaderCircle, type LucideIcon } from "lucide-react";
import * as React from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--shadow-md)] hover:bg-[var(--color-primary-hover)]",
  secondary:
    "bg-[var(--color-surface-elevated)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface)]",
  ghost:
    "bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface)]",
  outline:
    "border border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface)]",
  destructive: "bg-[var(--color-error)] text-white hover:opacity-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm gap-2",
  md: "h-11 px-4 text-base gap-2.5",
  lg: "h-12 px-5 text-base gap-3",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  iconPosition = "left",
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : Icon && iconPosition === "left" ? (
        <Icon className="h-4 w-4" aria-hidden="true" />
      ) : null}
      {children ? <span>{children}</span> : null}
      {!loading && Icon && iconPosition === "right" ? (
        <Icon className="h-4 w-4" aria-hidden="true" />
      ) : null}
    </button>
  );
}
