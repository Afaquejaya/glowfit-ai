// Client side of the public-demo quota: the server says a call was limited, the app shows a notice.

export type LimitReason = "visitor" | "reserve";
export const LIMIT_EVENT = "glowfit:limited";

export function notifyLimited(reason: LimitReason) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<LimitReason>(LIMIT_EVENT, { detail: reason }));
}
