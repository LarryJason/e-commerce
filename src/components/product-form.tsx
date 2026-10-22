"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, type ChangeEvent } from "react";
import { saveProductAction } from "@/app/actions/products";
import { FieldError, FormAlert, SubmitButton, TextField } from "@/components/form-fields";
import { initialActionState } from "@/lib/action-state";
import { ACCEPTED_IMAGE_TYPES, isUploadedImage, MAX_IMAGE_BYTES } from "@/lib/product-image";

export type ProductFormValues = {
  id?: number;
  name: string;
  description: string;
  category: string;
  price: string;
  stock: string;
  imageUrl: string;
  isActive: boolean;
};

export function ProductForm({
  product,
  categories,
  cancelHref,
}: {
  product?: ProductFormValues;
  categories: string[];
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(saveProductAction, initialActionState);
  // Après une erreur, on réaffiche la saisie ; sinon, les valeurs du produit.
  const values = state.values ?? {
    name: product?.name ?? "",
    description: product?.description ?? "",
    category: product?.category ?? "",
    price: product?.price ?? "",
    stock: product?.stock ?? "0",
    // Une image téléversée n'est pas une URL à modifier : elle est affichée à part.
    imageUrl: isUploadedImage(product?.imageUrl) ? "" : (product?.imageUrl ?? ""),
  };
  const fieldState = { ...state, values };
  const descriptionErrors = state.fieldErrors?.description;
  const currentUpload = isUploadedImage(product?.imageUrl) ? product!.imageUrl : null;

  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const imageErrors = fileError ? [fileError] : state.fieldErrors?.imageFile;
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileError(null);
    setPreview(null);
    if (!file) return;
    // Vérifié aussi côté serveur ; ici on évite d'envoyer un fichier refusé d'avance.
    if (file.size > MAX_IMAGE_BYTES) {
      setFileError("L'image ne doit pas dépasser 2 Mo.");
      event.target.value = "";
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  return (
    <form action={formAction} className="flex flex-col gap-2" noValidate>
      <FormAlert state={state} />
      {product?.id && <input type="hidden" name="productId" value={product.id} />}
      <TextField label="Nom du produit" name="name" required maxLength={120} state={fieldState} />

      <fieldset className="fieldset">
        <label htmlFor="field-description" className="fieldset-legend">
          Description
        </label>
        <textarea
          id="field-description"
          name="description"
          className={`textarea h-32 w-full ${descriptionErrors ? "textarea-error" : ""}`}
          maxLength={2000}
          defaultValue={values.description}
          aria-invalid={descriptionErrors ? true : undefined}
          aria-describedby={descriptionErrors ? "field-description-error" : undefined}
        />
        {descriptionErrors && <FieldError id="field-description-error" errors={descriptionErrors} />}
      </fieldset>

      <div className="grid gap-2 sm:grid-cols-3">
        <TextField
          label="Catégorie"
          name="category"
          required
          maxLength={60}
          list="categories"
          state={fieldState}
        />
        <datalist id="categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <TextField label="Prix (€)" name="price" inputMode="decimal" placeholder="19,90" required state={fieldState} />
        <TextField label="Stock" name="stock" type="number" min={0} step={1} required state={fieldState} />
      </div>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Image (facultatif)</legend>
        <div className="flex flex-wrap items-start gap-4">
          {(preview ?? currentUpload) && (
            // Aperçu local (blob:) ou image déjà enregistrée : <img> simple.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview ?? currentUpload!}
              alt="Aperçu de l'image du produit"
              className="rounded-box border-base-300 size-28 border object-cover"
            />
          )}
          <div className="flex min-w-60 flex-1 flex-col gap-1">
            <label htmlFor="field-imageFile" className="sr-only">
              Téléverser une image
            </label>
            <input
              id="field-imageFile"
              name="imageFile"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handleFileChange}
              className={`file-input w-full ${imageErrors ? "file-input-error" : ""}`}
              aria-invalid={imageErrors ? true : undefined}
              aria-describedby={`field-imageFile-hint${imageErrors ? " field-imageFile-error" : ""}`}
            />
            <p id="field-imageFile-hint" className="label">
              JPEG, PNG, WebP ou GIF, 2 Mo maximum.
              {currentUpload && " Choisissez un fichier pour remplacer l'image actuelle."}
            </p>
            {imageErrors && <FieldError id="field-imageFile-error" errors={imageErrors} />}
            {currentUpload && !preview && (
              <label className="label cursor-pointer gap-2">
                <input type="checkbox" name="removeImage" className="checkbox checkbox-sm" />
                <span className="text-base-content">Supprimer l&apos;image actuelle</span>
              </label>
            )}
          </div>
        </div>
      </fieldset>

      <TextField
        label="…ou URL d'une image"
        name="imageUrl"
        type="url"
        placeholder="https://…"
        hint="Adresse https d'une image hébergée, utilisée si aucun fichier n'est choisi. Sans image, une vignette est générée."
        state={fieldState}
      />

      <label className="label mt-2 cursor-pointer gap-3">
        <input
          type="checkbox"
          name="isActive"
          className="toggle toggle-primary"
          defaultChecked={product?.isActive ?? true}
        />
        <span className="text-base-content">Visible dans le catalogue</span>
      </label>

      <div className="mt-4 flex gap-2">
        <SubmitButton>{product?.id ? "Enregistrer les modifications" : "Créer le produit"}</SubmitButton>
        <Link href={cancelHref} className="btn btn-ghost">
          Annuler
        </Link>
      </div>
    </form>
  );
}
