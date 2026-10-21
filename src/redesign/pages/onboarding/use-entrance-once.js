"use client";

import { useCallback, useState } from "react";

/**
 * v2 motion budget, "Register entrance": blueprint lines draw in, then the headline rises 8 px.
 * Once per browser; never under prefers-reduced-motion. Client-only (call under <ClientOnly>):
 * the decision is read once, lazily, so it never flips mid-visit. `markSeen` is called from the
 * animation's own end event, not from an effect.
 */
export function useEntranceOnce(key) {
  const [play] = useState(() => {
    try {
      return !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !window.localStorage.getItem(key);
    } catch {
      return false;
    }
  });
  const markSeen = useCallback(() => {
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      // Storage unavailable (private mode): the entrance may replay; harmless.
    }
  }, [key]);
  return { entrance: play ? "play" : "static", markSeen };
}

export const HALL_ENTRANCE_KEY = "coact:hall-entrance";
