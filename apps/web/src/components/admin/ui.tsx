"use client";
import { useCallback, useRef, useState } from "react";
import { DrinkPicture } from "../DrinkPicture";

/** Transient success/error message. Only shown after the API confirmed (or refused) the action. */
export function useToast() {
  const [toast, setToast] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((kind: "ok" | "error", text: string) => {
    clearTimeout(timer.current);
    setToast({ kind, text });
    timer.current = setTimeout(() => setToast(null), kind === "error" ? 7000 : 3500);
  }, []);
  const node = toast && (
    <div className="adm-toast" data-kind={toast.kind} role={toast.kind === "error" ? "alert" : "status"}>
      {toast.text}
    </div>
  );
  return { show, node };
}

/** A button that asks before doing something consequential, using the native <dialog>. */
export function ConfirmButton({
  label,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  className = "btn btn--ghost",
  disabled,
}: {
  label: React.ReactNode;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()} disabled={disabled}>
        {label}
      </button>
      <dialog ref={ref} className="adm-dialog" aria-labelledby={`${title}-t`}>
        <h2 id={`${title}-t`}>{title}</h2>
        <p>{body}</p>
        <div className="actions">
          <button type="button" className="btn btn--ghost" onClick={() => ref.current?.close()} disabled={busy}>
            Keep it
          </button>
          <button
            type="button"
            className={danger ? "btn btn--danger" : "btn"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
                ref.current?.close();
              }
            }}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}

export function Thumb({ imageUrl, liquid, layer }: { imageUrl: string | null; liquid: string | null; layer: string | null }) {
  return (
    <span className="thumb">
      <DrinkPicture imageUrl={imageUrl} liquid={liquid} layer={layer} />
    </span>
  );
}

export function StateBlock({ loading, error, empty, onRetry, children }: { loading: boolean; error: { message: string } | null; empty?: React.ReactNode; onRetry: () => void; children: React.ReactNode }) {
  if (error)
    return (
      <div className="notice notice--error" role="alert">
        {error.message}{" "}
        <button type="button" className="textbtn" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  if (loading) return <p className="adm-muted" aria-busy="true">Loading…</p>;
  if (empty) return <div className="adm-muted">{empty}</div>;
  return <>{children}</>;
}
