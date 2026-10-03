"use client";

import { EntryFlow } from "@/components/entry/entry-flow";

/**
 * Home Page / Entry Flow
 *
 * This page handles the complete customer entry experience:
 * 1. Parse QR from URL (?qr=table-12)
 * 2. Resolve table/cafe context via API
 * 3. Show loading splash
 * 4. Show welcome experience
 * 5. Transition to home
 *
 * The QR flow demonstrates contract-first architecture - all state
 * is managed through the entry context and resolved via API, not hardcoded.
 */

export default function HomePage() {
  return <EntryFlow />;
}
