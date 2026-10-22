import "server-only";
import { query, queryOne } from "@/lib/db";
import { UserFacingError } from "@/lib/errors";

export type CartItem = {
  product_id: number;
  name: string;
  category: string;
  image_url: string | null;
  seller_name: string;
  price_cents: number;
  stock: number;
  quantity: number;
  is_available: boolean;
};

export function getCart(userId: number) {
  return query<CartItem>(
    `SELECT c.product_id, p.name, p.category, p.image_url, u.name AS seller_name,
            p.price_cents, p.stock, c.quantity, (p.is_active AND u.is_active) AS is_available
     FROM cart_items c
     JOIN products p ON p.id = c.product_id
     JOIN users u ON u.id = p.seller_id
     WHERE c.user_id = $1
     ORDER BY c.added_at`,
    [userId],
  );
}

export async function getCartCount(userId: number) {
  const row = await queryOne<{ count: number }>(
    "SELECT coalesce(sum(quantity), 0)::int AS count FROM cart_items WHERE user_id = $1",
    [userId],
  );
  return row?.count ?? 0;
}

async function getPurchasableProduct(productId: number) {
  const product = await queryOne<{ stock: number; seller_id: number }>(
    `SELECT p.stock, p.seller_id FROM products p JOIN users u ON u.id = p.seller_id
     WHERE p.id = $1 AND p.is_active AND u.is_active`,
    [productId],
  );
  if (!product) throw new UserFacingError("Ce produit n'est plus disponible.");
  return product;
}

/** Ajoute au panier (la quantité est cumulée et plafonnée au stock disponible). */
export async function addToCart(userId: number, productId: number, quantity: number) {
  const product = await getPurchasableProduct(productId);
  if (product.seller_id === userId) {
    throw new UserFacingError("Vous ne pouvez pas acheter vos propres produits.");
  }
  if (product.stock < 1) throw new UserFacingError("Ce produit est en rupture de stock.");

  const row = await queryOne<{ quantity: number }>(
    `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, LEAST($3::int, $4::int))
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, $4::int, 99)
     RETURNING quantity`,
    [userId, productId, quantity, product.stock],
  );
  return row!.quantity;
}

export async function setCartQuantity(userId: number, productId: number, quantity: number) {
  if (quantity === 0) return removeFromCart(userId, productId);
  const product = await getPurchasableProduct(productId);
  if (quantity > product.stock) {
    throw new UserFacingError(`Stock insuffisant : ${product.stock} disponible(s).`);
  }
  await query("UPDATE cart_items SET quantity = $3 WHERE user_id = $1 AND product_id = $2", [
    userId,
    productId,
    quantity,
  ]);
}

export async function removeFromCart(userId: number, productId: number) {
  await query("DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2", [userId, productId]);
}
