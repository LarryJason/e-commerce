import { z } from "zod";
import { ORDER_STATUSES, ROLES } from "@/lib/roles";

// Schémas de validation partagés par les Server Actions. Toute donnée venant
// du navigateur passe par ici avant d'atteindre la base.

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Adresse e-mail trop longue.")
  .pipe(z.email("Adresse e-mail invalide."));

const password = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(128, "Le mot de passe ne doit pas dépasser 128 caractères.")
  .regex(/[a-zA-Z]/, "Le mot de passe doit contenir au moins une lettre.")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.");

export const idSchema = z.coerce.number().int().positive();

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Le nom est obligatoire.").max(100, "Nom trop long."),
    email,
    password,
    confirmPassword: z.string(),
    // Seuls ces deux rôles peuvent être choisis à l'inscription.
    accountType: z.enum(["client", "vendeur"], "Type de compte invalide."),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Le mot de passe est obligatoire.").max(128),
});

/** Convertit un prix saisi en euros ("12,50", "12.5") en centimes. */
export function parsePriceToCents(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

export const productSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(120, "Nom trop long."),
  description: z.string().trim().max(2000, "Description trop longue (2000 caractères max)."),
  category: z
    .string()
    .trim()
    .min(2, "La catégorie doit contenir au moins 2 caractères.")
    .max(60, "Catégorie trop longue."),
  priceCents: z
    .string()
    .transform((v, ctx) => {
      const cents = parsePriceToCents(v);
      if (cents === null || cents <= 0) {
        ctx.addIssue({ code: "custom", message: "Prix invalide (ex. : 19,90)." });
        return z.NEVER;
      }
      return cents;
    }),
  stock: z.coerce
    .number("Stock invalide.")
    .int("Le stock doit être un nombre entier.")
    .min(0, "Le stock ne peut pas être négatif.")
    .max(1_000_000, "Stock trop élevé."),
  imageUrl: z
    .string()
    .trim()
    .max(500, "URL trop longue.")
    .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), "L'image doit être une URL https://.")
    .transform((v) => (v === "" ? null : v)),
  isActive: z.boolean(),
});
export type ProductInput = z.output<typeof productSchema>;

export const cartQuantitySchema = z.coerce
  .number("Quantité invalide.")
  .int("Quantité invalide.")
  .min(0, "Quantité invalide.")
  .max(99, "Quantité maximale : 99.");

export const checkoutSchema = z.object({
  shippingName: z.string().trim().min(2, "Le nom du destinataire est obligatoire.").max(100),
  shippingAddress: z.string().trim().min(5, "L'adresse est obligatoire.").max(200),
  shippingPostalCode: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z -]{3,10}$/, "Code postal invalide."),
  shippingCity: z.string().trim().min(2, "La ville est obligatoire.").max(100),
});

export const orderStatusSchema = z.enum(ORDER_STATUSES, "Statut invalide.");
export const roleSchema = z.enum(ROLES, "Rôle invalide.");

/** Lit un champ texte d'un FormData (chaîne vide si absent). */
export function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export type FieldErrors = Record<string, string[] | undefined>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}
