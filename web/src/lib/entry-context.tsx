"use client";

import {
  type Cafe,
  type Branch,
  type Table,
  type Session,
  type Visit,
  fetchQrResolve,
  fetchVisitResolve,
} from "@/lib/api";
import * as React from "react";

/**
 * EntryContext manages the customer entry flow state.
 *
 * The state machine progresses:
 * idle → loading → success (resolved) → error (if api fails or invalid qr)
 *
 * This context centralizes QR resolution and table context so any component
 * can know the current cafe, branch, table, and session without prop drilling.
 */

export type EntryState =
  | { status: "idle" }
  | { status: "loading"; qrToken: string }
  | {
      status: "resolved";
      qrToken: string;
      cafe: Cafe;
      branch: Branch;
      table: Table;
      session: Session;
      visit: Visit;
    }
  | { status: "error"; qrToken?: string; error: string };

export interface EntryContextType {
  state: EntryState;
  resolveQr: (token: string) => Promise<void>;
  reset: () => void;
}

const EntryContext = React.createContext<EntryContextType | undefined>(
  undefined,
);

function persistEntryState(nextState: EntryState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (nextState.status === "resolved") {
      window.localStorage.setItem(
        "nexa-entry-state",
        JSON.stringify(nextState),
      );
      return;
    }

    window.localStorage.removeItem("nexa-entry-state");
  } catch {}
}

export function EntryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<EntryState>({ status: "idle" });
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const saved = window.localStorage.getItem("nexa-entry-state");
      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved) as EntryState;
      if (parsed.status === "resolved" && parsed.visit) {
        setState(parsed);
      }
    } catch {
    } finally {
      setHydrated(true);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || !hydrated) {
      return;
    }
    persistEntryState(state);
  }, [state, hydrated]);

  const resolveQr = React.useCallback(async (token: string) => {
    if (!token) {
      setState({ status: "error", error: "No QR code provided" });
      return;
    }

    setState({ status: "loading", qrToken: token });

    try {
      const response = await fetchQrResolve(token);

      if (!response.data?.cafe || !response.data?.table) {
        throw new Error("Invalid QR response: missing required data");
      }

      const visitResponse = await fetchVisitResolve({
        cafeId: response.data.cafe.id,
        branchId: response.data.branch.id,
        tableId: response.data.table.id,
        customerId: response.data.session.customerId ?? null,
        sessionId: response.data.session.id,
      });

      const resolvedState: EntryState = {
        status: "resolved",
        qrToken: token,
        cafe: response.data.cafe,
        branch: response.data.branch,
        table: response.data.table,
        session: response.data.session,
        visit: visitResponse.data,
      };

      persistEntryState(resolvedState);
      setState(resolvedState);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to resolve QR code. Please try again.";

      setState({
        status: "error",
        qrToken: token,
        error: errorMessage,
      });
    }
  }, []);

  const reset = React.useCallback(() => {
    setState({ status: "idle" });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("nexa-entry-state");
    }
  }, []);

  const value: EntryContextType = {
    state,
    resolveQr,
    reset,
  };

  return (
    <EntryContext.Provider value={value}>{children}</EntryContext.Provider>
  );
}

export function useEntry() {
  const context = React.useContext(EntryContext);
  if (!context) {
    throw new Error("useEntry must be used within EntryProvider");
  }
  return context;
}
