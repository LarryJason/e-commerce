"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { errorState, type ActionState } from "@/lib/action-state";
import { getDummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { createUser, findUserForLogin } from "@/lib/data/users";
import { isUniqueViolation } from "@/lib/errors";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { ROLE_HOME } from "@/lib/roles";
import { field, fieldErrors, loginSchema, registerSchema } from "@/lib/validation";

/** N'accepte qu'un chemin interne pour éviter les redirections ouvertes. */
function safeRedirectPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : null;
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = {
    name: field(formData, "name"),
    email: field(formData, "email"),
    accountType: field(formData, "accountType"),
  };
  const parsed = registerSchema.safeParse({
    ...values,
    password: field(formData, "password"),
    confirmPassword: field(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    return errorState("Veuillez corriger les champs indiqués.", { fieldErrors: fieldErrors(parsed.error), values });
  }

  const { name, email, password, accountType } = parsed.data;
  let userId: number;
  try {
    userId = await createUser({ name, email, role: accountType, passwordHash: await hashPassword(password) });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return errorState("Un compte existe déjà avec cette adresse e-mail.", {
        fieldErrors: { email: ["Adresse déjà utilisée."] },
        values,
      });
    }
    throw error;
  }
  await createSession(userId);
  redirect(ROLE_HOME[accountType]);
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { email: field(formData, "email") };
  const parsed = loginSchema.safeParse({ email: values.email, password: field(formData, "password") });
  if (!parsed.success) {
    return errorState("Veuillez corriger les champs indiqués.", { fieldErrors: fieldErrors(parsed.error), values });
  }
  const { email, password } = parsed.data;

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limitKey = `login:${ip}:${email}`;
  const limit = rateLimit(limitKey, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterMs / 60000);
    return errorState(`Trop de tentatives. Réessayez dans ${minutes} minute(s).`, { values });
  }

  const user = await findUserForLogin(email);
  // On vérifie toujours un hash, même factice, pour ne pas révéler par le
  // temps de réponse si l'adresse existe.
  const valid = await verifyPassword(password, user?.password_hash ?? (await getDummyHash()));
  if (!user || !valid) return errorState("E-mail ou mot de passe incorrect.", { values });
  if (!user.is_active) {
    return errorState("Ce compte a été désactivé. Contactez l'administrateur.", { values });
  }

  resetRateLimit(limitKey);
  await createSession(user.id);
  redirect(safeRedirectPath(field(formData, "next")) ?? ROLE_HOME[user.role]);
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
