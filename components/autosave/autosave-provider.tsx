"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "failed" | "conflict";

export interface PendingEdit {
  id: string;
  label: string;
  status: AutosaveStatus;
  message?: string;
  retry: () => void | Promise<void>;
  discard: () => void;
  focus: () => void;
}

export interface AutosaveContextValue {
  franchiseId: string;
  revision: number;
  getRevision: () => number;
  setRevision: (revision: number) => void;
  /** Saves run one at a time so a batch of edits keeps a single, in-step revision. */
  runSerialized: <T>(task: () => Promise<T>) => Promise<T>;
  report: (edit: PendingEdit) => void;
  clear: (id: string) => void;
}

const AutosaveContext = createContext<AutosaveContextValue | null>(null);

export function useAutosave(): AutosaveContextValue {
  const value = useContext(AutosaveContext);
  if (!value) throw new Error("useAutosave must be used inside an AutosaveProvider");
  return value;
}

type GuardAction = { kind: "navigate"; href: string } | { kind: "submit"; form: HTMLFormElement };

function isProtected(edit: PendingEdit): boolean {
  return edit.status === "saving" || edit.status === "failed" || edit.status === "conflict";
}

export function AutosaveProvider({
  franchiseId,
  initialRevision,
  children,
}: {
  franchiseId: string;
  initialRevision: number;
  children: ReactNode;
}) {
  const router = useRouter();

  const revisionRef = useRef(initialRevision);
  const [revision, setRevisionState] = useState(initialRevision);

  const setRevision = useCallback((next: number) => {
    if (!Number.isFinite(next)) return;
    revisionRef.current = next;
    setRevisionState(next);
  }, []);
  const getRevision = useCallback(() => revisionRef.current, []);

  const editsRef = useRef<Record<string, PendingEdit>>({});
  const [edits, setEdits] = useState<Record<string, PendingEdit>>({});

  const report = useCallback((edit: PendingEdit) => {
    editsRef.current = { ...editsRef.current, [edit.id]: edit };
    setEdits(editsRef.current);
  }, []);

  const clear = useCallback((id: string) => {
    if (!editsRef.current[id]) return;
    const next = { ...editsRef.current };
    delete next[id];
    editsRef.current = next;
    setEdits(next);
  }, []);

  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const runSerialized = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = queueRef.current.then(task, task);
    queueRef.current = run.catch(() => undefined);
    return run;
  }, []);

  const protectedEdits = useCallback(
    () => Object.values(editsRef.current).filter(isProtected),
    [],
  );

  const [guard, setGuard] = useState<GuardAction | null>(null);
  const guardRef = useRef<GuardAction | null>(null);
  const bypassRef = useRef(false);
  const [guardBusy, setGuardBusy] = useState(false);

  useEffect(() => {
    guardRef.current = guard;
  }, [guard]);

  const continueWith = useCallback(
    (action: GuardAction | null) => {
      if (!action) return;
      bypassRef.current = true;

      if (action.kind === "navigate") {
        router.push(action.href);
        window.setTimeout(() => {
          bypassRef.current = false;
        }, 0);
        return;
      }

      const form = action.form;
      window.setTimeout(() => {
        form.requestSubmit();
        window.setTimeout(() => {
          bypassRef.current = false;
        }, 0);
      }, 0);
    },
    [router],
  );

  const continueAction = useCallback(() => {
    const action = guardRef.current;
    setGuard(null);
    continueWith(action);
  }, [continueWith]);

  const stay = useCallback(() => {
    setGuard(null);
    const first = protectedEdits()[0];
    first?.focus();
  }, [protectedEdits]);

  const discardAndContinue = useCallback(() => {
    const action = guardRef.current;
    const pending = protectedEdits();
    setGuard(null);
    for (const edit of pending) edit.discard();
    window.setTimeout(() => continueWith(action), 0);
  }, [continueWith, protectedEdits]);

  const retryAndContinue = useCallback(async () => {
    setGuardBusy(true);
    const pending = protectedEdits();
    await Promise.all(pending.map((edit) => Promise.resolve(edit.retry())));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    setGuardBusy(false);

    if (protectedEdits().length === 0) continueAction();
    else stay();
  }, [continueAction, protectedEdits, stay]);

  // Pending-input protection: an unload prompt, plus in-app navigation and form
  // submits routed through the guard so input is never silently dropped.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (protectedEdits().length === 0) return;
      event.preventDefault();
      event.returnValue = "";
    }

    function onClick(event: MouseEvent) {
      if (bypassRef.current || event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (protectedEdits().length === 0) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      if (anchor.hasAttribute("download") || anchor.target === "_blank") return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      event.preventDefault();
      setGuard({ kind: "navigate", href: `${url.pathname}${url.search}${url.hash}` });
    }

    function onSubmit(event: Event) {
      if (bypassRef.current || event.defaultPrevented) return;
      if (protectedEdits().length === 0) return;
      event.preventDefault();
      setGuard({ kind: "submit", form: event.target as HTMLFormElement });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (bypassRef.current || event.defaultPrevented) return;
      if (!guardRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        stay();
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [protectedEdits, stay]);

  const value = useMemo<AutosaveContextValue>(
    () => ({ franchiseId, revision, getRevision, setRevision, runSerialized, report, clear }),
    [franchiseId, revision, getRevision, setRevision, runSerialized, report, clear],
  );

  const editList = Object.values(edits);
  const unsaved = editList.filter(isProtected);
  const saving = editList.filter((edit) => edit.status === "saving");
  const blocked = editList.filter((edit) => edit.status === "failed" || edit.status === "conflict");

  let summary = "All changes saved to app.";
  if (blocked.length > 0) {
    summary = `${blocked.length} change${blocked.length === 1 ? "" : "s"} not saved — fix or discard below.`;
  } else if (saving.length > 0) {
    summary = `Saving ${saving.length} change${saving.length === 1 ? "" : "s"}…`;
  }

  return (
    <AutosaveContext.Provider value={value}>
      <p
        role="status"
        aria-live="polite"
        className={`mb-3 text-xs ${blocked.length > 0 ? "text-ink" : "text-ink-muted"}`}
      >
        {summary}
        {blocked.length > 0 ? (
          <span> Nothing is lost: every unsaved value stays in this form until you retry or discard it.</span>
        ) : null}
      </p>
      {children}

      {guard ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-title"
            className="w-full max-w-md rounded-lg border border-line bg-surface p-5 shadow-lg"
          >
            <h2 id="unsaved-title" className="text-sm font-semibold">
              You have unsaved input
            </h2>
            <p className="mt-2 max-w-prose text-sm text-ink-muted">
              {unsaved.length} change{unsaved.length === 1 ? "" : "s"} in {franchiseId ? "this franchise" : "this form"}{" "}
              {unsaved.length === 1 ? "is" : "are"} not saved yet. Nothing has been written to the app, and no
              value was silently overwritten.
            </p>
            <ul className="mt-2 space-y-1">
              {unsaved.slice(0, 4).map((edit) => (
                <li key={edit.id} className="text-xs text-ink-muted">
                  {edit.label}
                  {edit.message ? ` — ${edit.message}` : ""}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={stay}
                className="min-h-11 rounded-md border border-line bg-background px-4 text-sm font-medium"
              >
                Stay and keep editing
              </button>
              <button
                type="button"
                onClick={() => void retryAndContinue()}
                disabled={guardBusy}
                className="min-h-11 rounded-md border border-line bg-background px-4 text-sm font-medium disabled:opacity-60"
              >
                {guardBusy ? "Retrying…" : "Retry then continue"}
              </button>
              <button
                type="button"
                onClick={discardAndContinue}
                className="min-h-11 rounded-md border border-line bg-background px-4 text-sm font-medium"
              >
                Discard and continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AutosaveContext.Provider>
  );
}

export function AutosaveScope({
  franchiseId,
  revision,
  children,
}: {
  franchiseId: string;
  revision: number;
  children: ReactNode;
}) {
  return (
    <AutosaveProvider franchiseId={franchiseId} initialRevision={revision}>
      {children}
    </AutosaveProvider>
  );
}
