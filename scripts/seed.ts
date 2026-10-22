import { hashPassword } from "../src/lib/auth/password";
import { createPool, loadEnv } from "./lib";

// Données de démonstration. Le script est idempotent et n'écrase ni ne
// supprime rien : un compte existant (même e-mail) est laissé tel quel,
// et les produits ne sont créés que pour un vendeur qui n'en a aucun.

const DEMO_USERS = [
  { email: "admin@boutique.test", name: "Alice Admin", role: "admin", password: "Admin123!" },
  { email: "vendeur@boutique.test", name: "Atelier Martin", role: "vendeur", password: "Vendeur123!" },
  { email: "vendeuse@boutique.test", name: "Maison Diallo", role: "vendeur", password: "Vendeur123!" },
  { email: "client@boutique.test", name: "Claire Client", role: "client", password: "Client123!" },
] as const;

const DEMO_PRODUCTS: Record<string, Array<[string, string, string, number, number]>> = {
  "vendeur@boutique.test": [
    ["Tasse en céramique", "Tasse artisanale émaillée, 30 cl, passe au lave-vaisselle.", "Maison", 1890, 25],
    ["Lampe de bureau en chêne", "Lampe orientable en chêne massif, ampoule LED E27 fournie.", "Maison", 6900, 8],
    ["Carnet en cuir A5", "Carnet relié en cuir pleine fleur, 192 pages lignées.", "Papeterie", 2450, 40],
    ["Stylo plume laiton", "Stylo plume en laiton brossé, plume moyenne en acier.", "Papeterie", 3900, 0],
  ],
  "vendeuse@boutique.test": [
    ["Sac cabas en wax", "Cabas doublé en tissu wax, anses renforcées.", "Mode", 3500, 15],
    ["Savon au karité", "Savon saponifié à froid, 100 g, sans parfum ajouté.", "Beauté", 650, 120],
    ["Écharpe en laine mérinos", "Écharpe douce 180 × 30 cm, tricotée en France.", "Mode", 4500, 12],
    ["Thé vert à la menthe", "Mélange de thé vert gunpowder et menthe, sachet de 200 g.", "Épicerie", 990, 60],
  ],
};

loadEnv();
const pool = createPool();

async function main() {
  try {
    for (const user of DEMO_USERS) {
      const { rowCount } = await pool.query(
        `INSERT INTO users (email, name, role, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ((lower(email))) DO NOTHING`,
        [user.email, user.name, user.role, await hashPassword(user.password)],
      );
      console.log(rowCount ? `✔ Compte créé : ${user.email}` : `• Compte déjà présent : ${user.email}`);
    }

    for (const [email, products] of Object.entries(DEMO_PRODUCTS)) {
      const { rows } = await pool.query<{ id: number; count: number }>(
        `SELECT u.id, (SELECT count(*)::int FROM products p WHERE p.seller_id = u.id) AS count
         FROM users u WHERE lower(u.email) = lower($1) AND u.role = 'vendeur'`,
        [email],
      );
      const seller = rows[0];
      if (!seller || seller.count > 0) continue;
      for (const [name, description, category, price, stock] of products) {
        await pool.query(
          `INSERT INTO products (seller_id, name, description, category, price_cents, stock)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [seller.id, name, description, category, price, stock],
        );
      }
      console.log(`✔ ${products.length} produits créés pour ${email}`);
    }
    console.log("Données de démonstration prêtes.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
