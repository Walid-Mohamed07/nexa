import * as React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)]",
        className,
      ].join(" ")}
    />
  );
}

export function TextSkeleton({ className = "" }: { className?: string }) {
  return <Skeleton className={["h-4 w-full", className].join(" ")} />;
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <Skeleton className="h-28 w-full rounded-[var(--radius-md)]" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
