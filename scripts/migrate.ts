import { createPool, loadEnv, runMigrations } from "./lib";

loadEnv();
const pool = createPool();

async function main() {
  try {
    await runMigrations(pool);
    console.log("Base de données à jour.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
