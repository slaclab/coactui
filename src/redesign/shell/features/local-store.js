"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny localStorage-backed store read through useSyncExternalStore, so a persisted value is
 * never mirrored into useState: every consumer (and every tab, via the "storage" event) sees
 * the same value. The server/hydration snapshot is `fallback`.
 *   const store = createLocalStore("key", { fallback: null });
 *   store.useValue() → string | fallback   ·   store.get()   ·   store.set(v)   ·   store.remove()
 */
export function createLocalStore(key, { fallback = null } = {}) {
  const listeners = new Set();
  const notify = () => listeners.forEach((l) => l());

  const get = () => {
    if (typeof window === "undefined") return fallback;
    try {
      const v = window.localStorage.getItem(key);
      return v == null ? fallback : v;
    } catch {
      return fallback;
    }
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    const onStorage = (e) => {
      if (e.key === null || e.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  return {
    key,
    get,
    set(value) {
      try {
        window.localStorage.setItem(key, String(value));
      } catch {
        // Storage unavailable (private mode, quota): keep the in-memory default.
      }
      notify();
    },
    remove() {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
      notify();
    },
    useValue() {
      return useSyncExternalStore(subscribe, get, () => fallback);
    },
  };
}
