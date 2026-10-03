"use client";

import { Coffee } from "lucide-react";
import {
  FadeUp,
  StaggerContainer,
  StaggerItem,
} from "@/components/motion/motion-utils";
import { type Cafe, type Table } from "@/lib/api";

interface EntryWelcomeProps {
  cafe: Cafe;
  table: Table;
  customerName?: string;
  onContinue: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function EntryWelcome({
  cafe,
  table,
  customerName,
  onContinue,
}: EntryWelcomeProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[var(--color-background)] px-4 py-8">
      <StaggerContainer className="w-full max-w-md space-y-8 text-center">
        {/* Greeting */}
        <StaggerItem>
          <p className="text-base text-[var(--color-text-muted)]">
            {getGreeting()}
          </p>
        </StaggerItem>

        {/* Cafe Logo and Name */}
        <StaggerItem>
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-md)]">
                <Coffee
                  className="h-10 w-10 text-[var(--color-primary)]"
                  aria-hidden="true"
                />
              </div>
            </div>
            <h1 className="wrap-break-word text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text)]">
              {customerName ? `Welcome back, ${customerName}` : "Welcome to"}
            </h1>
            <p className="text-2xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
              {cafe.name}
            </p>
          </div>
        </StaggerItem>

        {/* Table Information */}
        <StaggerItem>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
            <p className="text-sm text-[var(--color-text-muted)]">Your table</p>
            <p className="text-lg font-medium text-[var(--color-text)]">
              {table.name}
            </p>
          </div>
        </StaggerItem>

        {/* Message */}
        <StaggerItem>
          <p className="text-base leading-6 text-[var(--color-text-muted)]">
            Enjoy your time with us. Explore our menu and we&apos;ll prepare
            your order with care.
          </p>
        </StaggerItem>

        {/* CTA Button */}
        <StaggerItem>
          <button
            onClick={onContinue}
            className="w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 font-medium text-[var(--color-on-primary)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] active:scale-95"
          >
            Continue
          </button>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}
