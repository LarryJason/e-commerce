"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action-state";

export function SubmitButton({ children, className = "btn btn-primary" }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
      {pending ? "Envoi en cours…" : children}
    </button>
  );
}

export function FormAlert({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <div role="alert" className={`alert ${state.status === "error" ? "alert-error" : "alert-success"} alert-soft`}>
      <span>{state.message}</span>
    </div>
  );
}

type TextFieldProps = {
  label: string;
  name: string;
  state: ActionState;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>;

/** Champ texte accessible : libellé, aide et erreurs reliés via aria-describedby. */
export function TextField({ label, name, state, hint, ...props }: TextFieldProps) {
  const errors = state.fieldErrors?.[name];
  const id = `field-${name}`;
  const describedBy = [hint && `${id}-hint`, errors && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset className="fieldset">
      <label htmlFor={id} className="fieldset-legend">
        {label}
      </label>
      <input
        id={id}
        name={name}
        className={`input w-full ${errors ? "input-error" : ""}`}
        defaultValue={state.values?.[name]}
        aria-invalid={errors ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && (
        <p id={`${id}-hint`} className="label">
          {hint}
        </p>
      )}
      {errors && <FieldError id={`${id}-error`} errors={errors} />}
    </fieldset>
  );
}

export function FieldError({ id, errors }: { id: string; errors: string[] }) {
  return (
    <p id={id} className="text-error text-sm">
      {errors.join(" ")}
    </p>
  );
}
