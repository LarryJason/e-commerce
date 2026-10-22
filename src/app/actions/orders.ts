"use server";

import { revalidatePath } from "next/cache";
import { errorState, successState, type ActionState } from "@/lib/action-state";
import { requireRole } from "@/lib/auth/guards";
import { changeOrderStatus } from "@/lib/data/orders";
import { UserFacingError } from "@/lib/errors";
import { field, idSchema, orderStatusSchema } from "@/lib/validation";

/** Annulation par le client propriétaire de la commande (statut « en attente » uniquement). */
export async function cancelMyOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(["client"], "/commandes");
  const orderId = idSchema.safeParse(field(formData, "orderId"));
  if (!orderId.success) return errorState("Commande invalide.");

  try {
    await changeOrderStatus(orderId.data, "annulee", { onlyIfOwnedBy: user.id, customerCancel: true });
  } catch (error) {
    if (error instanceof UserFacingError) return errorState(error.message);
    throw error;
  }
  revalidatePath("/commandes", "layout");
  return successState("Commande annulée. Les articles ont été remis en stock.");
}

/** Changement de statut par l'administrateur. */
export async function updateOrderStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"], "/admin/commandes");
  const orderId = idSchema.safeParse(field(formData, "orderId"));
  const status = orderStatusSchema.safeParse(field(formData, "status"));
  if (!orderId.success) return errorState("Commande invalide.");
  if (!status.success) return errorState("Statut invalide.");

  try {
    await changeOrderStatus(orderId.data, status.data);
  } catch (error) {
    if (error instanceof UserFacingError) return errorState(error.message);
    throw error;
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/commandes", "layout");
  return successState("Statut mis à jour.");
}
