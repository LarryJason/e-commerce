import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { query, queryOne } from "@/lib/db";
import type { Role } from "@/lib/roles";
import { SESSION_COOKIE } from "./constants";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
};

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET doit contenir au moins 32 caractères (voir .env.example).");
  }
  return secret;
}

/** Seul ce HMAC du jeton est stocké en base : une fuite de la table ne permet pas d'usurper une session. */
function sessionId(token: string) {
  return createHmac("sha256", getSecret()).update(token).digest("hex");
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await query("INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)", [
    sessionId(token),
    userId,
    expiresAt,
  ]);
  // Ménage opportuniste des sessions expirées.
  await query("DELETE FROM sessions WHERE expires_at < now()");

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // WebKit (Playwright sous Linux) refuse les cookies Secure sur http://localhost :
    // SESSION_COOKIE_INSECURE=1 permet de tester un build de production en HTTP.
    secure: process.env.NODE_ENV === "production" && process.env.SESSION_COOKIE_INSECURE !== "1",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE id = $1", [sessionId(token)]);
  store.delete(SESSION_COOKIE);
}

/**
 * Utilisateur courant, relu en base à chaque requête : le rôle provient
 * toujours du serveur, jamais d'une donnée envoyée par le navigateur.
 * Un compte désactivé perd immédiatement l'accès.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return queryOne<SessionUser>(
    `SELECT u.id, u.email, u.name, u.role
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > now() AND u.is_active`,
    [sessionId(token)],
  );
});
