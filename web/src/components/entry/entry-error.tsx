"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import {
  FadeUp,
  StaggerContainer,
  StaggerItem,
} from "@/components/motion/motion-utils";

interface EntryErrorProps {
  error: string;
  onRetry: () => void;
}

export function EntryError({ error, onRetry }: EntryErrorProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[var(--color-background)] px-4 py-8">
      <StaggerContainer className="w-full max-w-md space-y-6 text-center">
        {/* Error Icon */}
        <StaggerItem>
          <div className="flex justify-center">
            <div className="rounded-full border border-[var(--color-error)] bg-[var(--color-error)]/5 p-5">
              <AlertCircle
                className="h-10 w-10 text-[var(--color-error)]"
                aria-hidden="true"
              />
            </div>
          </div>
        </StaggerItem>

        {/* Error Message */}
        <StaggerItem>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text)]">
              We couldn&apos;t recognize this table
            </h1>
            <p className="text-base text-[var(--color-text-muted)]">{error}</p>
          </div>
        </StaggerItem>

        {/* Guidance */}
        <StaggerItem>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
            <p className="text-sm text-[var(--color-text-muted)]">
              Please try scanning the QR code again, or ask a member of our team
              for help.
            </p>
          </div>
        </StaggerItem>

        {/* Actions */}
        <StaggerItem>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 font-medium text-[var(--color-on-primary)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] active:scale-95"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try Again
          </button>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}
