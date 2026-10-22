import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <p className="text-base-content/70">La page ou le produit demandé n&apos;existe pas ou n&apos;est plus disponible.</p>
      <Link href="/" className="btn btn-primary">
        Retour au catalogue
      </Link>
    </div>
  );
}
