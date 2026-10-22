import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Accès refusé" };

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Accès refusé</h1>
      <p className="text-base-content/70">
        Votre compte n&apos;a pas les droits nécessaires pour accéder à cette page.
      </p>
      <Link href="/" className="btn btn-primary">
        Retour au catalogue
      </Link>
    </div>
  );
}
