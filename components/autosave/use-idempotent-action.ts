"use client";

import { useCallback, useRef } from "react";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Wraps a form server action so a retry after a lost response replays the same
 * request id instead of applying the command twice. The id renews only after a
 * successful (status "ok") outcome, so the next deliberate action is a new one.
 */
export function useIdempotentAction<S extends { status?: string }>(
  action: (prev: S, formData: FormData) => Promise<S>,
): (prev: S, formData: FormData) => Promise<S> {
  const idRef = useRef<string>(newId());

  return useCallback(
    async (prev: S, formData: FormData) => {
      formData.set("requestId", idRef.current);
      const result = await action(prev, formData);
      if (result && result.status === "ok") idRef.current = newId();
      return result;
    },
    [action],
  );
}
