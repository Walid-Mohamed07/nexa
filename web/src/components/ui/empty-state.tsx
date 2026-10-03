import { AlertCircle, type LucideIcon } from "lucide-react";
import * as React from "react";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = AlertCircle,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text)]">
        {title}
      </h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-[var(--color-text-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
