"use client";

import * as React from "react";
import { useEntry } from "@/lib/entry-context";
import type { Visit } from "@/lib/api";
import {
  resolveDayContext,
  resolveTimeContext,
  type DayContext,
  type TimeContext,
} from "@/lib/recommendation-context";

export interface VisitContextValue {
  visit: Visit | null;
  timeContext: TimeContext;
  dayContext: DayContext;
}

const VisitContext = React.createContext<VisitContextValue | null>(null);

export function VisitProvider({ children }: { children: React.ReactNode }) {
  const { state } = useEntry();
  const visit = state.status === "resolved" ? state.visit : null;
  const timeContext = React.useMemo(() => resolveTimeContext(), []);
  const dayContext = React.useMemo(() => resolveDayContext(), []);

  return (
    <VisitContext.Provider value={{ visit, timeContext, dayContext }}>
      {children}
    </VisitContext.Provider>
  );
}

export function useVisit() {
  const context = React.useContext(VisitContext);
  if (!context) {
    throw new Error("useVisit must be used within VisitProvider");
  }
  return context;
}
