"use client";

import { useEntry } from "@/lib/entry-context";
import { CafeHome } from "@/components/entry/cafe-home";
import { EntryError } from "@/components/entry/entry-error";

/**
 * Home Page / Cafe Experience
 *
 * This page displays the main cafe home screen only after the entry flow
 * is complete and the customer has resolved their table context.
 *
 * In future phases, this will be extended to show:
 * - Featured items
 * - Menu sections
 * - Order history
 * - Personalized recommendations
 */

export default function HomePageFull() {
  const { state, reset, resolveQr } = useEntry();

  if (state.status !== "resolved") {
    return (
      <div className="min-h-screen bg-[var(--color-background)] px-4 py-10 text-[var(--color-text)] sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-base text-[var(--color-text-muted)]">
            {state.status === "error"
              ? "Error loading your table context."
              : "Please scan a QR code to continue."}
          </p>
          {state.status === "error" && (
            <button
              onClick={() => {
                reset();
                if (state.status === "error" && state.qrToken) {
                  resolveQr(state.qrToken);
                }
              }}
              className="mt-4 inline-block rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return <CafeHome />;
}
