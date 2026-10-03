export type TimeContext = "morning" | "afternoon" | "evening";
export type DayContext = "weekday" | "weekend";
export type OccasionContext =
  | "breakfast"
  | "study"
  | "work"
  | "friends"
  | "family"
  | "evening";

export function resolveTimeContext(currentTime = new Date()): TimeContext {
  const hour = currentTime.getUTCHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

export function resolveDayContext(currentTime = new Date()): DayContext {
  const day = currentTime.getUTCDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}
