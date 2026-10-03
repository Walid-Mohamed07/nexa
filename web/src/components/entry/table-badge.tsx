"use client";

import { useEntry } from "@/lib/entry-context";

export function TableBadge() {
  const { state } = useEntry();

  if (state.status !== "resolved" || !state.table) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
      <span className="text-xs uppercase tracking-[0.12em]">Table</span>
      <span className="font-medium text-[var(--color-text)]">
        {state.table.name}
      </span>
    </div>
  );
}
