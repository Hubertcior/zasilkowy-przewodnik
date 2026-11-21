"use client";

import { useSyncExternalStore } from "react";

const today = () => new Date().toISOString().slice(0, 10);
const noopSubscribe = () => () => {};

/** Today's date on the client; null while prerendering (cacheComponents forbids reading the clock then). */
export function useToday(): string | null {
  return useSyncExternalStore(noopSubscribe, today, () => null);
}
