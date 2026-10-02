"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { autosavePlayerField } from "../../lib/actions/franchises";
import { useAutosave, type AutosaveStatus } from "./autosave-provider";

const DEBOUNCE_MS = 700;

type Intent = "plan" | "recorded";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function toInput(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function toDisplay(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Unknown";
  return String(value);
}

const STATUS_TEXT: Record<AutosaveStatus, string> = {
  idle: "No unsaved changes",
  saving: "Saving…",
  saved: "Saved to app",
  failed: "Not saved",
  conflict: "Conflict — nothing written",
};

export function AutosaveField({
  playerId,
  fieldKey,
  label,
  numeric,
  baselineValue,
  planValue,
}: {
  playerId: string;
  fieldKey: string;
  label: string;
  numeric: boolean;
  baselineValue: unknown;
  planValue: unknown;
}) {
  const { franchiseId, getRevision, setRevision, runSerialized, report, clear } = useAutosave();
  const id = `${playerId}:${fieldKey}`;

  const [draft, setDraft] = useState(() => toInput(planValue ?? baselineValue));
  const [intent, setIntent] = useState<Intent>("plan");
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [recorded, setRecorded] = useState<unknown>(baselineValue);
  const [planned, setPlanned] = useState<unknown>(planValue);

  const lastSavedRef = useRef<{ value: string; intent: Intent }>({
    value: toInput(planValue ?? baselineValue),
    intent: "plan",
  });
  const requestIdRef = useRef<string>(newId());
  const inputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(draft);
  const intentRef = useRef(intent);
  const persistRef = useRef<(opts?: { isRetry?: boolean }) => Promise<void>>(async () => {});

  useEffect(() => {
    draftRef.current = draft;
    intentRef.current = intent;
  }, [draft, intent]);

  const focus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const discard = useCallback(() => {
    setDraft(lastSavedRef.current.value);
    setIntent(lastSavedRef.current.intent);
    setStatus("idle");
    setMessage(undefined);
    clear(id);
  }, [clear, id]);

  const persist = useCallback(
    async (opts: { isRetry?: boolean } = {}) => {
      const value = draft;
      const chosenIntent = intent;
      if (!opts.isRetry) requestIdRef.current = newId();

      const pending = {
        retry: () => persistRef.current({ isRetry: true }),
        discard,
        focus,
      };

      setStatus("saving");
      setMessage("Saving…");
      report({ id, label, status: "saving", ...pending });

      const result = await runSerialized(() =>
        autosavePlayerField({
          playerId,
          franchiseId,
          fieldKey,
          value: value.trim() === "" ? null : value.trim(),
          intent: chosenIntent,
          expectedRevision: getRevision(),
          requestId: requestIdRef.current,
        }),
      );

      if (result.outcome === "saved") {
        lastSavedRef.current = { value, intent: chosenIntent };
        setRecorded(result.baselineValue ?? null);
        setPlanned(result.planValue ?? null);
        setStatus("saved");
        setMessage(result.message);
        if (typeof result.revision === "number") setRevision(result.revision);
        if (draftRef.current === value && intentRef.current === chosenIntent) clear(id);
        return;
      }

      const failedStatus: AutosaveStatus = result.outcome === "conflict" ? "conflict" : "failed";
      setStatus(failedStatus);
      setMessage(result.message);
      report({ id, label, status: failedStatus, message: result.message, ...pending });
    },
    [
      clear,
      discard,
      draft,
      fieldKey,
      focus,
      franchiseId,
      getRevision,
      id,
      intent,
      label,
      playerId,
      report,
      runSerialized,
      setRevision,
    ],
  );

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  // Autosave: any change to value or intent is written after a short pause.
  // Pending input is reported immediately so navigation can be guarded.
  useEffect(() => {
    const dirty = draft !== lastSavedRef.current.value || intent !== lastSavedRef.current.intent;
    if (!dirty) return;

    report({
      id,
      label,
      status: "saving",
      message: "Unsaved changes",
      retry: () => persistRef.current({ isRetry: true }),
      discard,
      focus,
    });

    const timer = window.setTimeout(() => {
      void persistRef.current();
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, intent, id, label, report, discard, focus]);

  const showRetry = status === "failed" || status === "conflict";

  return (
    <div className="grid gap-2 rounded-md border border-line bg-background p-3 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_auto] sm:items-end">
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          Recorded: {toDisplay(recorded)}
          {planned === null || planned === undefined ? "" : ` · Planned: ${toDisplay(planned)}`}
        </p>
      </div>
      <label className="flex flex-col gap-1">
        <span className="sr-only">{label} value</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          inputMode={numeric ? "numeric" : "text"}
          placeholder={numeric ? "0" : "Unknown"}
          className="min-h-11 rounded-md border border-line bg-surface px-3 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="sr-only">{label} intent</span>
        <select
          value={intent}
          onChange={(event) => setIntent(event.target.value === "recorded" ? "recorded" : "plan")}
          className="min-h-11 rounded-md border border-line bg-surface px-2 text-sm"
        >
          <option value="plan">Plan it</option>
          <option value="recorded">Already happened</option>
        </select>
      </label>
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <p
          role="status"
          aria-live="polite"
          className={`text-xs ${showRetry ? "text-ink" : "text-ink-muted"}`}
        >
          {STATUS_TEXT[status]}
        </p>
        {showRetry ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void persistRef.current({ isRetry: true })}
              className="min-h-9 rounded-md border border-line bg-surface px-2 text-xs font-medium"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={discard}
              className="min-h-9 rounded-md border border-line bg-surface px-2 text-xs font-medium"
            >
              Discard
            </button>
          </div>
        ) : null}
      </div>
      {message && showRetry ? (
        <p role="alert" className="text-xs text-ink-muted sm:col-span-4">
          {message}
        </p>
      ) : null}
    </div>
  );
}
