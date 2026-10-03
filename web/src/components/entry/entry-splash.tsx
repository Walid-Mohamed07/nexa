"use client";

import { Coffee } from "lucide-react";
import { FadeIn } from "@/components/motion/motion-utils";

export function EntrySplash() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[var(--color-background)]">
      <FadeIn>
        <div className="flex flex-col items-center gap-8 text-center">
          {/* Logo/Icon */}
          <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
            <Coffee
              className="h-12 w-12 text-[var(--color-primary)]"
              aria-hidden="true"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text)]">
              Preparing your table
            </h1>
            <p className="text-base text-[var(--color-text-muted)]">
              Just a moment...
            </p>
          </div>

          {/* Subtle loading indicator */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-[var(--color-primary)]"
                style={{
                  animation: `pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>

          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              [style*="animation"] {
                animation: none !important;
                opacity: 0.8 !important;
              }
            }
          `}</style>
        </div>
      </FadeIn>
    </div>
  );
}
