import { AlertCircle } from "lucide-react";

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-error)]/20 bg-[var(--color-error)]/5 px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--color-error)] ring-1 ring-[var(--color-error)]/20">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text)]">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-[var(--color-text-muted)]">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
