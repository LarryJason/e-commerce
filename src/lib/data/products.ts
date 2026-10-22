import "server-only";
import { query, queryOne, type Queryable } from "@/lib/db";
import { uploadedImageUrl, type ImageType } from "@/lib/product-image";
import type { ProductInput } from "@/lib/validation";

export type Product = {
  id: number;
  seller_id: number;
  seller_name: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const SELECT_PRODUCT = `
  SELECT p.id, p.seller_id, u.name AS seller_name, p.name, p.description, p.category,
         p.price_cents, p.stock, p.image_url, p.is_active, p.created_at, p.updated_at
  FROM products p JOIN users u ON u.id = p.seller_id`;

/** Un produit est visible au catalogue s'il est actif et que son vendeur l'est aussi. */
const PUBLIC_FILTER = "p.is_active AND u.is_active";

export function listCatalog(filters: { search?: string; category?: string }) {
  const conditions = [PUBLIC_FILTER];
  const params: unknown[] = [];
  if (filters.search) {
    params.push(`%${filters.search.replace(/[\\%_]/g, "\\$&")}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
  }
  if (filters.category) {
    params.push(filters.category);
    conditions.push(`p.category = $${params.length}`);
  }
  return query<Product>(
    `${SELECT_PRODUCT} WHERE ${conditions.join(" AND ")} ORDER BY p.created_at DESC, p.id DESC LIMIT 100`,
    params,
  );
}

export async function listCategories() {
  const rows = await query<{ category: string }>(
    `SELECT DISTINCT p.category FROM products p JOIN users u ON u.id = p.seller_id
     WHERE ${PUBLIC_FILTER} ORDER BY p.category`,
  );
  return rows.map((r) => r.category);
}

export function getPublicProduct(id: number) {
  return queryOne<Product>(`${SELECT_PRODUCT} WHERE p.id = $1 AND ${PUBLIC_FILTER}`, [id]);
}

/** Produit quel que soit son statut — l'appelant doit vérifier les droits. */
export function getProduct(id: number) {
  return queryOne<Product>(`${SELECT_PRODUCT} WHERE p.id = $1`, [id]);
}

export function listSellerProducts(sellerId: number) {
  return query<Product>(`${SELECT_PRODUCT} WHERE p.seller_id = $1 ORDER BY p.created_at DESC`, [sellerId]);
}

export function listAllProducts() {
  return query<Product>(`${SELECT_PRODUCT} ORDER BY p.created_at DESC`);
}

export async function createProduct(sellerId: number, input: ProductInput, db?: Queryable) {
  const row = await queryOne<{ id: number }>(
    `INSERT INTO products (seller_id, name, description, category, price_cents, stock, image_url, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [sellerId, input.name, input.description, input.category, input.priceCents, input.stock, input.imageUrl, input.isActive],
    db,
  );
  return row!.id;
}

export async function updateProduct(id: number, input: ProductInput, db?: Queryable) {
  const rows = await query(
    `UPDATE products SET name = $2, description = $3, category = $4, price_cents = $5,
            stock = $6, image_url = $7, is_active = $8, updated_at = now()
     WHERE id = $1 RETURNING id`,
    [id, input.name, input.description, input.category, input.priceCents, input.stock, input.imageUrl, input.isActive],
    db,
  );
  return rows.length > 0;
}

export async function setProductActive(id: number, isActive: boolean) {
  const rows = await query("UPDATE products SET is_active = $2, updated_at = now() WHERE id = $1 RETURNING id", [
    id,
    isActive,
  ]);
  return rows.length > 0;
}

/** Les commandes passées gardent leur copie du nom et du prix (product_id passe à NULL). */
export async function deleteProduct(id: number) {
  const rows = await query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);
  return rows.length > 0;
}

export type ProductImageFile = { contentType: ImageType; data: Buffer };

/** Enregistre (ou remplace) l'image téléversée et fait pointer le produit vers elle. */
export async function saveProductImage(productId: number, image: ProductImageFile, db?: Queryable) {
  await query(
    `INSERT INTO product_images (product_id, content_type, data) VALUES ($1, $2, $3)
     ON CONFLICT (product_id) DO UPDATE SET content_type = $2, data = $3, updated_at = now()`,
    [productId, image.contentType, image.data],
    db,
  );
  await query("UPDATE products SET image_url = $2 WHERE id = $1", [productId, uploadedImageUrl(productId)], db);
}

export async function deleteProductImage(productId: number, db?: Queryable) {
  await query("DELETE FROM product_images WHERE product_id = $1", [productId], db);
}

export function getProductImage(productId: number) {
  return queryOne<{ content_type: string; data: Buffer }>(
    "SELECT content_type, data FROM product_images WHERE product_id = $1",
    [productId],
  );
}
