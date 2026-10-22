import type { FieldErrors } from "@/lib/validation";

/** État renvoyé par les Server Actions aux formulaires (useActionState). */
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors;
  /** Valeurs saisies, renvoyées pour pré-remplir le formulaire après une erreur. */
  values?: Record<string, string>;
};

export const initialActionState: ActionState = { status: "idle" };

export function errorState(message: string, extra: Omit<ActionState, "status" | "message"> = {}): ActionState {
  return { status: "error", message, ...extra };
}

export function successState(message: string): ActionState {
  return { status: "success", message };
}
