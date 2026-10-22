"use client";

import { useActionState } from "react";
import { checkoutAction } from "@/app/actions/cart";
import { FormAlert, SubmitButton, TextField } from "@/components/form-fields";
import { initialActionState } from "@/lib/action-state";

export function CheckoutForm({ defaultName, totalLabel }: { defaultName: string; totalLabel: string }) {
  const [state, formAction] = useActionState(checkoutAction, initialActionState);
  return (
    <form action={formAction} className="flex flex-col gap-2" noValidate>
      <FormAlert state={state} />
      <TextField
        label="Nom du destinataire"
        name="shippingName"
        autoComplete="name"
        required
        state={{ ...state, values: state.values ?? { shippingName: defaultName } }}
      />
      <TextField label="Adresse" name="shippingAddress" autoComplete="street-address" required state={state} />
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
        <TextField label="Code postal" name="shippingPostalCode" autoComplete="postal-code" required state={state} />
        <TextField label="Ville" name="shippingCity" autoComplete="address-level2" required state={state} />
      </div>
      <div role="note" className="alert alert-info alert-soft mt-2 text-sm">
        Paiement à la livraison : aucune donnée bancaire n&apos;est demandée.
      </div>
      <SubmitButton className="btn btn-primary mt-2">Confirmer la commande ({totalLabel})</SubmitButton>
    </form>
  );
}
