import "server-only";
import { query, queryOne } from "@/lib/db";
import type { Role } from "@/lib/roles";

export type UserRow = {
  id: number;
  email: string;
  name: string;
  role: Role;
  is_active: boolean;
  created_at: Date;
};

export function findUserForLogin(email: string) {
  return queryOne<UserRow & { password_hash: string }>(
    `SELECT id, email, name, role, is_active, created_at, password_hash
     FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
}

export async function createUser(input: { email: string; name: string; passwordHash: string; role: Role }) {
  const row = await queryOne<{ id: number }>(
    `INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`,
    [input.email, input.name, input.passwordHash, input.role],
  );
  return row!.id;
}

export function listUsers() {
  return query<UserRow & { product_count: number; order_count: number }>(
    `SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at,
            (SELECT count(*)::int FROM products p WHERE p.seller_id = u.id) AS product_count,
            (SELECT count(*)::int FROM orders o WHERE o.user_id = u.id) AS order_count
     FROM users u ORDER BY u.created_at DESC`,
  );
}

export async function updateUserRole(userId: number, role: Role) {
  const rows = await query("UPDATE users SET role = $2 WHERE id = $1 RETURNING id", [userId, role]);
  return rows.length > 0;
}

export async function setUserActive(userId: number, isActive: boolean) {
  const rows = await query("UPDATE users SET is_active = $2 WHERE id = $1 RETURNING id", [userId, isActive]);
  // Un compte désactivé est déconnecté partout.
  if (!isActive) await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
  return rows.length > 0;
}

export async function getAdminStats() {
  return (await queryOne<{
    users: number;
    sellers: number;
    products: number;
    orders: number;
    pending_orders: number;
    revenue_cents: number;
  }>(
    `SELECT (SELECT count(*)::int FROM users) AS users,
            (SELECT count(*)::int FROM users WHERE role = 'vendeur') AS sellers,
            (SELECT count(*)::int FROM products) AS products,
            (SELECT count(*)::int FROM orders) AS orders,
            (SELECT count(*)::int FROM orders WHERE status = 'en_attente') AS pending_orders,
            (SELECT coalesce(sum(total_cents), 0)::int FROM orders WHERE status <> 'annulee') AS revenue_cents`,
  ))!;
}
