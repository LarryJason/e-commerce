import "server-only";
import type { PoolClient } from "pg";
import { query, queryOne, withTransaction } from "@/lib/db";
import { UserFacingError } from "@/lib/errors";
import { canCustomerCancel, canTransition } from "@/lib/order-rules";
import type { OrderStatus } from "@/lib/roles";

export type Order = {
  id: number;
  user_id: number;
  customer_name: string;
  customer_email: string;
  status: OrderStatus;
  total_cents: number;
  shipping_name: string;
  shipping_address: string;
  shipping_postal_code: string;
  shipping_city: string;
  created_at: Date;
  item_count: number;
};

export type OrderItem = {
  id: number;
  order_id: number;
  product_id: number | null;
  seller_id: number;
  seller_name: string;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
};

export type ShippingInfo = {
  shippingName: string;
  shippingAddress: string;
  shippingPostalCode: string;
  shippingCity: string;
};

const SELECT_ORDER = `
  SELECT o.id, o.user_id, u.name AS customer_name, u.email AS customer_email, o.status,
         o.total_cents, o.shipping_name, o.shipping_address, o.shipping_postal_code,
         o.shipping_city, o.created_at,
         (SELECT coalesce(sum(quantity), 0)::int FROM order_items i WHERE i.order_id = o.id) AS item_count
  FROM orders o JOIN users u ON u.id = o.user_id`;

/**
 * Transforme le panier en commande, dans une transaction : les produits sont
 * verrouillés (FOR UPDATE) pour que deux commandes simultanées ne puissent pas
 * vendre le même stock, puis le stock est décrémenté et le panier vidé.
 */
export async function placeOrder(userId: number, shipping: ShippingInfo) {
  return withTransaction(async (client) => {
    const { rows: lines } = await client.query<{
      product_id: number;
      quantity: number;
      name: string;
      price_cents: number;
      stock: number;
      seller_id: number;
      available: boolean;
    }>(
      `SELECT c.product_id, c.quantity, p.name, p.price_cents, p.stock, p.seller_id,
              (p.is_active AND u.is_active) AS available
       FROM cart_items c
       JOIN products p ON p.id = c.product_id
       JOIN users u ON u.id = p.seller_id
       WHERE c.user_id = $1
       ORDER BY p.id
       FOR UPDATE OF p`,
      [userId],
    );

    if (lines.length === 0) throw new UserFacingError("Votre panier est vide.");
    for (const line of lines) {
      if (!line.available) throw new UserFacingError(`« ${line.name} » n'est plus disponible.`);
      if (line.seller_id === userId) {
        throw new UserFacingError(`Vous ne pouvez pas acheter votre propre produit « ${line.name} ».`);
      }
      if (line.quantity > line.stock) {
        throw new UserFacingError(`Stock insuffisant pour « ${line.name} » (${line.stock} disponible(s)).`);
      }
    }

    const total = lines.reduce((sum, l) => sum + l.price_cents * l.quantity, 0);
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO orders (user_id, total_cents, shipping_name, shipping_address, shipping_postal_code, shipping_city)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId, total, shipping.shippingName, shipping.shippingAddress, shipping.shippingPostalCode, shipping.shippingCity],
    );
    const orderId = rows[0].id;

    for (const line of lines) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, seller_id, product_name, unit_price_cents, quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, line.product_id, line.seller_id, line.name, line.price_cents, line.quantity],
      );
      await client.query("UPDATE products SET stock = stock - $2, updated_at = now() WHERE id = $1", [
        line.product_id,
        line.quantity,
      ]);
    }
    await client.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
    return orderId;
  });
}

export function listUserOrders(userId: number) {
  return query<Order>(`${SELECT_ORDER} WHERE o.user_id = $1 ORDER BY o.created_at DESC`, [userId]);
}

export function listAllOrders() {
  return query<Order>(`${SELECT_ORDER} ORDER BY o.created_at DESC`);
}

/** Commande sans contrôle d'accès — l'appelant doit vérifier les droits. */
export function getOrder(orderId: number) {
  return queryOne<Order>(`${SELECT_ORDER} WHERE o.id = $1`, [orderId]);
}

export function getOrderItems(orderId: number) {
  return query<OrderItem>(
    `SELECT i.id, i.order_id, i.product_id, i.seller_id, s.name AS seller_name,
            i.product_name, i.unit_price_cents, i.quantity
     FROM order_items i JOIN users s ON s.id = i.seller_id
     WHERE i.order_id = $1 ORDER BY i.id`,
    [orderId],
  );
}

export type SellerOrder = Omit<Order, "item_count" | "total_cents"> & {
  items: OrderItem[];
  seller_total_cents: number;
};

/** Commandes contenant au moins un article du vendeur — seules ses lignes sont renvoyées. */
export async function listSellerOrders(sellerId: number): Promise<SellerOrder[]> {
  const orders = await query<Omit<SellerOrder, "items" | "seller_total_cents">>(
    `SELECT o.id, o.user_id, u.name AS customer_name, u.email AS customer_email, o.status,
            o.shipping_name, o.shipping_address, o.shipping_postal_code, o.shipping_city, o.created_at
     FROM orders o JOIN users u ON u.id = o.user_id
     WHERE EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.id AND i.seller_id = $1)
     ORDER BY o.created_at DESC`,
    [sellerId],
  );
  if (orders.length === 0) return [];
  const items = await query<OrderItem>(
    `SELECT i.id, i.order_id, i.product_id, i.seller_id, s.name AS seller_name,
            i.product_name, i.unit_price_cents, i.quantity
     FROM order_items i JOIN users s ON s.id = i.seller_id
     WHERE i.seller_id = $1 AND i.order_id = ANY($2::int[]) ORDER BY i.id`,
    [sellerId, orders.map((o) => o.id)],
  );
  return orders.map((order) => {
    const own = items.filter((i) => i.order_id === order.id);
    return {
      ...order,
      items: own,
      seller_total_cents: own.reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0),
    };
  });
}

async function restock(client: PoolClient, orderId: number) {
  await client.query(
    `UPDATE products p SET stock = p.stock + i.quantity, updated_at = now()
     FROM order_items i WHERE i.order_id = $1 AND i.product_id = p.id`,
    [orderId],
  );
}

/**
 * Change le statut d'une commande en respectant les transitions autorisées.
 * Une annulation remet les articles en stock.
 */
export async function changeOrderStatus(
  orderId: number,
  to: OrderStatus,
  options: { onlyIfOwnedBy?: number; customerCancel?: boolean } = {},
) {
  await withTransaction(async (client) => {
    const { rows } = await client.query<{ status: OrderStatus; user_id: number }>(
      "SELECT status, user_id FROM orders WHERE id = $1 FOR UPDATE",
      [orderId],
    );
    const order = rows[0];
    if (!order || (options.onlyIfOwnedBy !== undefined && order.user_id !== options.onlyIfOwnedBy)) {
      throw new UserFacingError("Commande introuvable.");
    }
    if (order.status === to) return;
    if (options.customerCancel && !canCustomerCancel(order.status)) {
      throw new UserFacingError("Cette commande est déjà en cours de traitement et ne peut plus être annulée.");
    }
    if (!canTransition(order.status, to)) {
      throw new UserFacingError("Ce changement de statut n'est pas autorisé pour cette commande.");
    }
    await client.query("UPDATE orders SET status = $2, updated_at = now() WHERE id = $1", [orderId, to]);
    if (to === "annulee") await restock(client, orderId);
  });
}
