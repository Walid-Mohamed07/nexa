"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEntry } from "@/lib/entry-context";
import { EntrySplash } from "@/components/entry/entry-splash";
import { EntryWelcome } from "@/components/entry/entry-welcome";
import { EntryError } from "@/components/entry/entry-error";
import { CafeHome } from "@/components/entry/cafe-home";
import { useOrder } from "@/lib/order-context";
import { useEffect } from "react";

/**
 * Entry Flow Component
 *
 * Handles the complete customer entry experience:
 * 1. Parse QR from URL (?qr=table-12)
 * 2. Resolve table/cafe context via API
 * 3. Show loading splash
 * 4. Show welcome experience
 * 5. Transition to home
 */

function EntryFlowContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state, resolveQr, reset } = useEntry();
  const flow = useOrder();

  // Only clear the entry state from the dedicated QR landing page.
  // Leaving the QR page for /home should preserve the resolved visit context.
  useEffect(() => {
    const qrToken = searchParams.get("qr");

    if (qrToken) {
      resolveQr(qrToken);
      return;
    }

    if (pathname === "/") {
      reset();
    }
  }, [pathname, searchParams, resolveQr, reset]);

  // Show appropriate state
  if (state.status === "loading") {
    return <EntrySplash />;
  }

  if (state.status === "error") {
    return (
      <EntryError
        error={state.error}
        onRetry={() => {
          reset();
          const qrToken = searchParams.get("qr");
          if (qrToken) {
            resolveQr(qrToken);
          }
        }}
      />
    );
  }

  if (state.status === "resolved") {
    if (flow.customerLoading) {
      return <EntrySplash />;
    }

    return (
      <>
        <EntryWelcome
          cafe={state.cafe}
          table={state.table}
          customerName={flow.customer?.name}
          onContinue={() => {
            router.push("/home");
          }}
        />
        <div className="hidden">
          <CafeHome />
        </div>
      </>
    );
  }

  // No QR provided - show a clean entry point
  return (
    <main className="min-h-screen bg-[var(--color-background)] px-4 py-10 text-[var(--color-text)] sm:px-6">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Phase 2.2
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
            NEXA Café
          </h1>
          <p className="text-base text-[var(--color-text-muted)]">
            Scan the QR code at your table to get started
          </p>
        </div>

        {/* Dev Testing Helper */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]">
          <p className="mb-3 font-medium text-[var(--color-text)]">
            For development testing:
          </p>
          <code className="block rounded bg-[var(--color-surface-elevated)] px-3 py-2 text-xs font-mono">
            ?qr=table-12
          </code>
          <p className="mt-3">
            Use this URL parameter to test the entry flow. Example:
          </p>
          <code className="block rounded bg-[var(--color-surface-elevated)] px-3 py-2 text-xs font-mono">
            localhost:3000?qr=table-12
          </code>
        </div>
      </div>
    </main>
  );
}

export function EntryFlow() {
  return (
    <Suspense fallback={<EntrySplash />}>
      <EntryFlowContent />
    </Suspense>
  );
}
