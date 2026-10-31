import { connection, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { logger } from "@/lib/logger";

const DB_TIMEOUT_MS = 3000;

export async function GET() {
  // Le contrôle doit s'exécuter à chaque requête, jamais être prérendu au build.
  await connection();
  const start = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      query("SELECT 1"),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), DB_TIMEOUT_MS);
      }),
    ]);

    return NextResponse.json(
      { status: "ok", db: "ok", dbLatencyMs: Date.now() - start },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error("[health] base de données injoignable :", { error });
    return NextResponse.json(
      { status: "error", db: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timer);
  }
}
