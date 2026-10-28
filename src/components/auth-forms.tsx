"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/app/actions/auth";
import { FieldError, FormAlert, SubmitButton, TextField } from "@/components/form-fields";
import { initialActionState } from "@/lib/action-state";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAction, initialActionState);
  return (
    <form action={formAction} className="flex flex-col gap-2" noValidate>
      <FormAlert state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <TextField label="Adresse e-mail" name="email" type="email" autoComplete="email" required state={state} />
      <TextField
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        state={state}
      />
      <SubmitButton className="btn btn-primary mt-2">Se connecter</SubmitButton>
      <p className="text-center text-sm">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="link link-primary">
          Inscrivez-vous
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialActionState);
  const accountType = state.values?.accountType ?? "client";
  const typeErrors = state.fieldErrors?.accountType;
  return (
    <form action={formAction} className="flex flex-col gap-2" noValidate>
      <FormAlert state={state} />
      <fieldset className="fieldset" aria-describedby={typeErrors ? "accountType-error" : undefined}>
        <legend className="fieldset-legend">Type de compte</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="border-base-300 rounded-box has-checked:border-primary flex cursor-pointer gap-3 border p-3">
            <input type="radio" name="accountType" value="client" defaultChecked={accountType === "client"} className="radio radio-primary" />
            <span>
              <span className="block font-semibold">Client</span>
              <span className="text-muted text-sm">J&apos;achète des produits</span>
            </span>
          </label>
          <label className="border-base-300 rounded-box has-checked:border-primary flex cursor-pointer gap-3 border p-3">
            <input type="radio" name="accountType" value="vendeur" defaultChecked={accountType === "vendeur"} className="radio radio-primary" />
            <span>
              <span className="block font-semibold">Vendeur</span>
              <span className="text-muted text-sm">Je vends mes produits</span>
            </span>
          </label>
        </div>
        {typeErrors && <FieldError id="accountType-error" errors={typeErrors} />}
      </fieldset>
      <TextField label="Nom ou nom de boutique" name="name" autoComplete="name" required maxLength={100} state={state} />
      <TextField label="Adresse e-mail" name="email" type="email" autoComplete="email" required state={state} />
      <TextField
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="8 caractères minimum, avec au moins une lettre et un chiffre."
        state={state}
      />
      <TextField
        label="Confirmer le mot de passe"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        state={state}
      />
      <SubmitButton className="btn btn-primary mt-2">Créer mon compte</SubmitButton>
      <p className="text-center text-sm">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="link link-primary">
          Connectez-vous
        </Link>
      </p>
    </form>
  );
}
