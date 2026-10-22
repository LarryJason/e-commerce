import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/roles";
import { PageSkeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Créer un compte" };

export default function RegisterPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RegisterPageContent />
    </Suspense>
  );
}

async function RegisterPageContent() {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);

  return (
    <div className="card bg-base-100 border-base-300 mx-auto w-full max-w-lg border">
      <div className="card-body">
        <h1 className="card-title text-2xl">Créer un compte</h1>
        <RegisterForm />
      </div>
    </div>
  );
}
