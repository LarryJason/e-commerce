import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/roles";
import { getCurrentUser, type SessionUser } from "./session";

/**
 * Contrôles d'accès côté serveur. À appeler dans chaque page protégée ET
 * dans chaque Server Action : le proxy ne fait qu'une vérification rapide.
 */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/connexion?suivant=${encodeURIComponent(returnTo)}` : "/connexion");
  }
  return user;
}

export async function requireRole(roles: Role[], returnTo?: string): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (!roles.includes(user.role)) redirect("/acces-refuse");
  return user;
}
