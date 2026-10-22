"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorState, successState, type ActionState } from "@/lib/action-state";
import { requireRole } from "@/lib/auth/guards";
import { addToCart, removeFromCart, setCartQuantity } from "@/lib/data/cart";
import { placeOrder } from "@/lib/data/orders";
import { UserFacingError } from "@/lib/errors";
import { cartQuantitySchema, checkoutSchema, field, fieldErrors, idSchema } from "@/lib/validation";

// Le panier et la commande sont réservés aux clients.

export async function addToCartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const productId = idSchema.safeParse(field(formData, "productId"));
  const quantity = cartQuantitySchema.min(1, "Quantité invalide.").safeParse(field(formData, "quantity"));
  const user = await requireRole(["client"], productId.success ? `/produits/${productId.data}` : "/");
  if (!productId.success) return errorState("Produit invalide.");
  if (!quantity.success) return errorState(quantity.error.issues[0].message);

  try {
    const total = await addToCart(user.id, productId.data, quantity.data);
    revalidatePath("/", "layout");
    return successState(`Ajouté au panier (${total} dans le panier).`);
  } catch (error) {
    if (error instanceof UserFacingError) return errorState(error.message);
    throw error;
  }
}

export async function updateCartItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(["client"], "/panier");
  const productId = idSchema.safeParse(field(formData, "productId"));
  const quantity = cartQuantitySchema.safeParse(field(formData, "quantity"));
  if (!productId.success) return errorState("Produit invalide.");
  if (!quantity.success) return errorState(quantity.error.issues[0].message);

  try {
    await setCartQuantity(user.id, productId.data, quantity.data);
  } catch (error) {
    if (error instanceof UserFacingError) return errorState(error.message);
    throw error;
  }
  revalidatePath("/", "layout");
  return successState("Quantité mise à jour.");
}

export async function removeCartItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(["client"], "/panier");
  const productId = idSchema.safeParse(field(formData, "productId"));
  if (!productId.success) return errorState("Produit invalide.");
  await removeFromCart(user.id, productId.data);
  revalidatePath("/", "layout");
  return successState("Article retiré du panier.");
}

export async function checkoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(["client"], "/commande");
  const values = {
    shippingName: field(formData, "shippingName"),
    shippingAddress: field(formData, "shippingAddress"),
    shippingPostalCode: field(formData, "shippingPostalCode"),
    shippingCity: field(formData, "shippingCity"),
  };
  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) {
    return errorState("Veuillez corriger l'adresse de livraison.", { fieldErrors: fieldErrors(parsed.error), values });
  }

  let orderId: number;
  try {
    orderId = await placeOrder(user.id, parsed.data);
  } catch (error) {
    if (error instanceof UserFacingError) return errorState(error.message, { values });
    throw error;
  }
  revalidatePath("/", "layout");
  redirect(`/commandes/${orderId}?confirmee=1`);
}
