import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPool, loadEnv, runMigrations } from "../scripts/lib";
import { addToCart, getCart } from "@/lib/data/cart";
import { changeOrderStatus, listSellerOrders, placeOrder } from "@/lib/data/orders";
import { createProduct, getProduct, setProductActive } from "@/lib/data/products";
import { createUser, setUserActive } from "@/lib/data/users";
import { UserFacingError } from "@/lib/errors";

// Tests d'intégration sur une base PostgreSQL dédiée (TEST_DATABASE_URL),
// vidée avant chaque test. Ils sont ignorés si cette base n'est pas configurée.
loadEnv();
const testUrl = process.env.TEST_DATABASE_URL;
const enabled = Boolean(testUrl && new URL(testUrl).pathname.endsWith("_test"));
if (enabled) process.env.DATABASE_URL = testUrl;

const shipping = {
  shippingName: "Claire",
  shippingAddress: "1 rue de la Paix",
  shippingPostalCode: "75002",
  shippingCity: "Paris",
};
const product = { description: "", category: "Maison", imageUrl: null, isActive: true };

describe.skipIf(!enabled)("commandes (intégration PostgreSQL)", () => {
  const pool = enabled ? createPool(testUrl) : null!;
  let client: number, client2: number, seller: number, seller2: number;

  beforeAll(async () => {
    await runMigrations(pool, () => {});
  });

  afterAll(async () => {
    await pool.end();
    await (globalThis as { pgPool?: { end(): Promise<void> } }).pgPool?.end();
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE users, sessions, products, cart_items, orders, order_items RESTART IDENTITY CASCADE");
    const user = (email: string, role: "client" | "vendeur") =>
      createUser({ email, name: email, passwordHash: "x", role });
    [client, client2, seller, seller2] = await Promise.all([
      user("c1@test.fr", "client"),
      user("c2@test.fr", "client"),
      user("v1@test.fr", "vendeur"),
      user("v2@test.fr", "vendeur"),
    ]);
  });

  it("crée la commande, décrémente le stock et vide le panier", async () => {
    const p1 = await createProduct(seller, { ...product, name: "Tasse", priceCents: 1000, stock: 5 });
    const p2 = await createProduct(seller2, { ...product, name: "Bol", priceCents: 250, stock: 2 });
    await addToCart(client, p1, 2);
    await addToCart(client, p2, 1);

    const orderId = await placeOrder(client, shipping);

    const { rows } = await pool.query("SELECT total_cents, status FROM orders WHERE id = $1", [orderId]);
    expect(rows[0]).toEqual({ total_cents: 2250, status: "en_attente" });
    expect((await getProduct(p1))!.stock).toBe(3);
    expect((await getProduct(p2))!.stock).toBe(1);
    expect(await getCart(client)).toHaveLength(0);
  });

  it("plafonne l'ajout au panier au stock disponible", async () => {
    const p = await createProduct(seller, { ...product, name: "Tasse", priceCents: 1000, stock: 3 });
    await addToCart(client, p, 2);
    expect(await addToCart(client, p, 5)).toBe(3);
  });

  it("refuse une commande si le stock a baissé entre-temps, sans rien modifier", async () => {
    const p = await createProduct(seller, { ...product, name: "Tasse", priceCents: 1000, stock: 2 });
    await addToCart(client, p, 2);
    await addToCart(client2, p, 2);
    await placeOrder(client2, shipping);

    await expect(placeOrder(client, shipping)).rejects.toBeInstanceOf(UserFacingError);
    expect((await getProduct(p))!.stock).toBe(0);
    expect(await getCart(client)).toHaveLength(1);
  });

  it("n'autorise pas deux commandes simultanées à vendre le même stock", async () => {
    const p = await createProduct(seller, { ...product, name: "Lampe", priceCents: 5000, stock: 1 });
    await addToCart(client, p, 1);
    await addToCart(client2, p, 1);

    const results = await Promise.allSettled([placeOrder(client, shipping), placeOrder(client2, shipping)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await getProduct(p))!.stock).toBe(0);
  });

  it("refuse un produit masqué ou d'un vendeur désactivé", async () => {
    const p = await createProduct(seller, { ...product, name: "Tasse", priceCents: 1000, stock: 5 });
    await setProductActive(p, false);
    await expect(addToCart(client, p, 1)).rejects.toThrow("n'est plus disponible");

    await setProductActive(p, true);
    await addToCart(client, p, 1);
    await setUserActive(seller, false);
    await expect(placeOrder(client, shipping)).rejects.toThrow("n'est plus disponible");
  });

  it("remet en stock lors d'une annulation et respecte les droits du client", async () => {
    const p = await createProduct(seller, { ...product, name: "Tasse", priceCents: 1000, stock: 5 });
    await addToCart(client, p, 2);
    const orderId = await placeOrder(client, shipping);

    // Un autre client ne peut pas annuler cette commande.
    await expect(changeOrderStatus(orderId, "annulee", { onlyIfOwnedBy: client2, customerCancel: true })).rejects.toThrow(
      "introuvable",
    );
    await changeOrderStatus(orderId, "annulee", { onlyIfOwnedBy: client, customerCancel: true });
    expect((await getProduct(p))!.stock).toBe(5);
    // Une commande annulée ne peut plus changer de statut.
    await expect(changeOrderStatus(orderId, "expediee")).rejects.toBeInstanceOf(UserFacingError);
  });

  it("empêche le client d'annuler une commande déjà expédiée", async () => {
    const p = await createProduct(seller, { ...product, name: "Tasse", priceCents: 1000, stock: 5 });
    await addToCart(client, p, 1);
    const orderId = await placeOrder(client, shipping);
    await changeOrderStatus(orderId, "expediee");
    await expect(changeOrderStatus(orderId, "annulee", { onlyIfOwnedBy: client, customerCancel: true })).rejects.toThrow(
      "ne peut plus être annulée",
    );
  });

  it("ne montre au vendeur que ses propres lignes de commande", async () => {
    const p1 = await createProduct(seller, { ...product, name: "Tasse", priceCents: 1000, stock: 5 });
    const p2 = await createProduct(seller2, { ...product, name: "Bol", priceCents: 250, stock: 5 });
    await addToCart(client, p1, 1);
    await addToCart(client, p2, 2);
    await placeOrder(client, shipping);

    const orders = await listSellerOrders(seller2);
    expect(orders).toHaveLength(1);
    expect(orders[0].items.map((i) => i.product_name)).toEqual(["Bol"]);
    expect(orders[0].seller_total_cents).toBe(500);
  });

  it("empêche un vendeur d'acheter ses propres produits", async () => {
    const p = await createProduct(seller, { ...product, name: "Tasse", priceCents: 1000, stock: 5 });
    await expect(addToCart(seller, p, 1)).rejects.toThrow("vos propres produits");
  });
});
