"use client";

import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
      <p className="text-base-content/70">
        Nous n&apos;avons pas pu afficher cette page. Réessayez dans un instant ; si le problème persiste, la base de
        données est peut-être indisponible.
      </p>
      {error.digest && <p className="text-base-content/50 text-xs">Référence : {error.digest}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Réessayer
        </button>
        <Link href="/" className="btn btn-ghost">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
