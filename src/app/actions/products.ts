"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorState, successState, type ActionState } from "@/lib/action-state";
import { requireRole } from "@/lib/auth/guards";
import type { SessionUser } from "@/lib/auth/session";
import {
  createProduct,
  deleteProduct,
  deleteProductImage,
  getProduct,
  saveProductImage,
  setProductActive,
  updateProduct,
  type ProductImageFile,
} from "@/lib/data/products";
import { withTransaction } from "@/lib/db";
import { detectImageType, isUploadedImage, MAX_IMAGE_BYTES } from "@/lib/product-image";
import { field, fieldErrors, idSchema, productSchema } from "@/lib/validation";

/** Un vendeur ne gère que ses propres produits ; l'administrateur les gère tous. */
async function loadManageableProduct(user: SessionUser, rawId: string) {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return null;
  const product = await getProduct(id.data);
  if (!product || (user.role !== "admin" && product.seller_id !== user.id)) return null;
  return product;
}

/** Lit le fichier envoyé : null si aucun, sinon l'image ou un message d'erreur. */
async function readImageFile(formData: FormData): Promise<ProductImageFile | { error: string } | null> {
  const file = formData.get("imageFile");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_IMAGE_BYTES) return { error: "L'image ne doit pas dépasser 2 Mo." };
  const data = Buffer.from(await file.arrayBuffer());
  const contentType = detectImageType(data);
  if (!contentType) return { error: "Format non pris en charge (JPEG, PNG, WebP ou GIF)." };
  return { contentType, data };
}

function revalidateCatalog() {
  revalidatePath("/", "layout");
}

export async function saveProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(["vendeur", "admin"], "/vendeur");
  const rawId = field(formData, "productId");
  const values = {
    name: field(formData, "name"),
    description: field(formData, "description"),
    category: field(formData, "category"),
    priceCents: field(formData, "price"),
    stock: field(formData, "stock"),
    imageUrl: field(formData, "imageUrl"),
  };
  const parsed = productSchema.safeParse({ ...values, isActive: formData.get("isActive") === "on" });
  const image = await readImageFile(formData);
  const imageError = image && "error" in image ? image.error : null;
  if (!parsed.success || imageError) {
    const errors = parsed.success ? {} : fieldErrors(parsed.error);
    // Le champ du formulaire s'appelle « price ».
    return errorState("Veuillez corriger les champs indiqués.", {
      fieldErrors: { ...errors, price: errors.priceCents, imageFile: imageError ? [imageError] : undefined },
      values: { ...values, price: values.priceCents },
    });
  }
  const upload = image && !("error" in image) ? image : null;

  const product = rawId ? await loadManageableProduct(user, rawId) : null;
  if (rawId && !product) return errorState("Produit introuvable ou accès refusé.");
  if (!product && user.role !== "vendeur") return errorState("Seuls les vendeurs peuvent créer des produits.");

  // Sans nouveau fichier ni URL, l'image déjà téléversée est conservée sauf demande de suppression.
  const input = parsed.data;
  const keepUpload =
    !upload && !input.imageUrl && isUploadedImage(product?.image_url) && formData.get("removeImage") !== "on";
  if (keepUpload) input.imageUrl = product!.image_url;

  await withTransaction(async (db) => {
    let id: number;
    if (product) {
      await updateProduct(product.id, input, db);
      id = product.id;
    } else {
      id = await createProduct(user.id, input, db);
    }
    if (upload) await saveProductImage(id, upload, db);
    else if (!keepUpload) await deleteProductImage(id, db);
  });
  revalidateCatalog();
  redirect(user.role === "admin" ? "/admin/produits" : "/vendeur?enregistre=1");
}

export async function toggleProductActiveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(["vendeur", "admin"]);
  const product = await loadManageableProduct(user, field(formData, "productId"));
  if (!product) return errorState("Produit introuvable ou accès refusé.");
  await setProductActive(product.id, !product.is_active);
  revalidateCatalog();
  return successState(product.is_active ? "Produit retiré du catalogue." : "Produit remis en vente.");
}

export async function deleteProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(["vendeur", "admin"]);
  const product = await loadManageableProduct(user, field(formData, "productId"));
  if (!product) return errorState("Produit introuvable ou accès refusé.");
  await deleteProduct(product.id);
  revalidateCatalog();
  return successState(`« ${product.name} » a été supprimé.`);
}
