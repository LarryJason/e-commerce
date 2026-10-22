import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

// Un seul pool par processus, conservé entre les rechargements à chaud en dev.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

function getPool() {
  if (!globalForDb.pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL n'est pas défini (voir .env.example).");
    }
    globalForDb.pgPool = new Pool({ connectionString, max: 10 });
  }
  return globalForDb.pgPool;
}

export type Queryable = Pick<PoolClient, "query">;

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
  db: Queryable = getPool(),
) {
  const { rows } = await db.query<T>(text, params);
  return rows;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
  db: Queryable = getPool(),
) {
  const rows = await query<T>(text, params, db);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
