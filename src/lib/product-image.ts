// Règles des images téléversées, partagées par le formulaire et la Server Action.

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type ImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

const UPLOAD_PREFIX = "/images/produits/";

export function uploadedImageUrl(productId: number) {
  // Le paramètre de version invalide le cache navigateur à chaque remplacement.
  return `${UPLOAD_PREFIX}${productId}?v=${Date.now()}`;
}

export function isUploadedImage(url: string | null | undefined) {
  return !!url?.startsWith(UPLOAD_PREFIX);
}

/** Type réel d'après les premiers octets : le type MIME annoncé par le navigateur n'est pas fiable. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith([0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}
