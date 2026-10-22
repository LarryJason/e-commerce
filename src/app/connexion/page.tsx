import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/roles";
import { PageSkeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage(props: PageProps<"/connexion">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LoginPageContent {...props} />
    </Suspense>
  );
}

async function LoginPageContent({ searchParams }: PageProps<"/connexion">) {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);
  const next = (await searchParams).suivant;

  return (
    <div className="card bg-base-100 border-base-300 mx-auto w-full max-w-md border">
      <div className="card-body">
        <h1 className="card-title text-2xl">Connexion</h1>
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
    </div>
  );
}
