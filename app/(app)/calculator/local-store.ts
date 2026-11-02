"use client";

import { useSyncExternalStore } from "react";

/**
 * A value saved in this browser's localStorage. If storage is blocked, changes
 * still work for the session but aren't kept.
 */
export function createLocalStore<T>(key: string, fallback: T, normalize: (raw: unknown) => T) {
  let cachedRaw: string | null | undefined;
  let cached = fallback;
  let memory: T | null = null;
  const listeners = new Set<() => void>();

  function read(): T {
    if (memory) return memory;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      raw = null;
    }
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try {
        cached = raw ? normalize(JSON.parse(raw)) : fallback;
      } catch {
        cached = fallback;
      }
    }
    return cached;
  }

  function write(next: T) {
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
      memory = null;
    } catch {
      memory = next;
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function useValue(): T {
    return useSyncExternalStore(subscribe, read, () => fallback);
  }

  return { useValue, write };
}
