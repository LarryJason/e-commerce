import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";

const ROOT = path.resolve(import.meta.dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "db", "migrations");

/** Charge .env.local (sans écraser les variables déjà définies). */
export function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (existsSync(file)) process.loadEnvFile(file);
}

export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL est manquant. Copiez .env.example vers .env.local et renseignez-le.",
    );
  }
  return new Pool({ connectionString });
}

/**
 * Applique, dans l'ordre et chacune dans sa transaction, les migrations
 * SQL de db/migrations qui ne figurent pas encore dans schema_migrations.
 */
export async function runMigrations(pool: Pool, log = console.log) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  const { rows } = await pool.query<{ name: string }>(
    "SELECT name FROM schema_migrations",
  );
  const applied = new Set(rows.map((r) => r.name));
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      log(`✔ Migration appliquée : ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Échec de la migration ${file}`, { cause: error });
    } finally {
      client.release();
    }
  }
}
