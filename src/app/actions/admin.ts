"use server";

import { revalidatePath } from "next/cache";
import { errorState, successState, type ActionState } from "@/lib/action-state";
import { requireRole } from "@/lib/auth/guards";
import { setUserActive, updateUserRole } from "@/lib/data/users";
import { ROLE_LABELS } from "@/lib/roles";
import { field, idSchema, roleSchema } from "@/lib/validation";

export async function updateUserRoleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole(["admin"], "/admin/utilisateurs");
  const userId = idSchema.safeParse(field(formData, "userId"));
  const role = roleSchema.safeParse(field(formData, "role"));
  if (!userId.success || !role.success) return errorState("Données invalides.");
  // Évite qu'un administrateur se retire ses propres droits par erreur.
  if (userId.data === admin.id) return errorState("Vous ne pouvez pas modifier votre propre rôle.");

  if (!(await updateUserRole(userId.data, role.data))) return errorState("Utilisateur introuvable.");
  revalidatePath("/admin", "layout");
  return successState(`Rôle changé en « ${ROLE_LABELS[role.data]} ».`);
}

export async function toggleUserActiveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole(["admin"], "/admin/utilisateurs");
  const userId = idSchema.safeParse(field(formData, "userId"));
  if (!userId.success) return errorState("Utilisateur invalide.");
  if (userId.data === admin.id) return errorState("Vous ne pouvez pas désactiver votre propre compte.");
  const activate = field(formData, "activate") === "true";

  if (!(await setUserActive(userId.data, activate))) return errorState("Utilisateur introuvable.");
  revalidatePath("/", "layout");
  return successState(activate ? "Compte réactivé." : "Compte désactivé et déconnecté.");
}
