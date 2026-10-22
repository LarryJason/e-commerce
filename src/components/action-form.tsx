"use client";

import { useActionState, useId, useRef, type ReactNode } from "react";
import { initialActionState, type ActionState } from "@/lib/action-state";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Champs cachés envoyés avec le formulaire (identifiants…). */
  fields?: Record<string, string | number>;
  /** Champs visibles supplémentaires (select, quantité…). */
  children?: ReactNode;
  submitLabel: string;
  submitClassName?: string;
  className?: string;
  /** Si présent, une fenêtre de confirmation s'ouvre avant l'envoi. */
  confirm?: { title: string; description: string; confirmLabel?: string; danger?: boolean };
  showSuccess?: boolean;
};

/**
 * Formulaire générique branché sur une Server Action : état d'envoi,
 * message d'erreur ou de succès, et confirmation optionnelle (modale daisyUI).
 */
export function ActionForm({
  action,
  fields = {},
  children,
  submitLabel,
  submitClassName = "btn btn-sm",
  className = "flex flex-wrap items-center gap-2",
  confirm,
  showSuccess = true,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const label = pending ? (
    <>
      <span className="loading loading-spinner loading-xs" aria-hidden="true" />
      <span>Patientez…</span>
    </>
  ) : (
    submitLabel
  );

  return (
    <form action={formAction} className={className} aria-busy={pending}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}

      {confirm ? (
        <>
          <button
            type="button"
            className={submitClassName}
            disabled={pending}
            onClick={() => dialogRef.current?.showModal()}
          >
            {label}
          </button>
          <dialog ref={dialogRef} className="modal" aria-labelledby={titleId}>
            <div className="modal-box">
              <h2 id={titleId} className="text-lg font-bold">
                {confirm.title}
              </h2>
              <p className="py-4">{confirm.description}</p>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => dialogRef.current?.close()}>
                  Annuler
                </button>
                <button
                  type="submit"
                  className={confirm.danger ? "btn btn-error" : "btn btn-primary"}
                  onClick={() => dialogRef.current?.close()}
                >
                  {confirm.confirmLabel ?? "Confirmer"}
                </button>
              </div>
            </div>
          </dialog>
        </>
      ) : (
        <button type="submit" className={submitClassName} disabled={pending}>
          {label}
        </button>
      )}

      <span role="status" aria-live="polite" className="text-sm">
        {state.status === "error" && <span className="text-error">{state.message}</span>}
        {showSuccess && state.status === "success" && <span className="text-success">{state.message}</span>}
      </span>
    </form>
  );
}
