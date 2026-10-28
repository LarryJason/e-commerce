import Link from "next/link";
import { Suspense } from "react";
import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartCount } from "@/lib/data/cart";
import { ROLE_LABELS } from "@/lib/roles";

export function Navbar() {
  return (
    <header className="on-primary bg-primary text-primary-content sticky top-0 z-30">
      <nav className="navbar mx-auto max-w-6xl gap-2 px-4" aria-label="Navigation principale">
        <div className="flex-1">
          <Link href="/" className="text-xl font-bold tracking-tight">
            La Boutique
          </Link>
        </div>
        {/* La lecture de la session dépend de la requête : elle est diffusée à part. */}
        <Suspense fallback={<div className="skeleton bg-primary-content/20 h-8 w-40" aria-hidden="true" />}>
          <UserNav />
        </Suspense>
      </nav>
    </header>
  );
}

async function UserNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex gap-2">
        <Link href="/connexion" className="btn btn-ghost btn-sm">
          Connexion
        </Link>
        <Link href="/inscription" className="btn btn-secondary btn-sm">
          Créer un compte
        </Link>
      </div>
    );
  }

  const cartCount = user.role === "client" ? await getCartCount(user.id) : 0;
  const links =
    user.role === "client"
      ? [
          { href: "/", label: "Catalogue" },
          { href: "/commandes", label: "Mes commandes" },
        ]
      : user.role === "vendeur"
        ? [
            { href: "/vendeur", label: "Mes produits" },
            { href: "/vendeur/commandes", label: "Commandes reçues" },
            { href: "/", label: "Voir le catalogue" },
          ]
        : [
            { href: "/admin", label: "Tableau de bord" },
            { href: "/admin/utilisateurs", label: "Utilisateurs" },
            { href: "/admin/produits", label: "Produits" },
            { href: "/admin/commandes", label: "Commandes" },
          ];

  return (
    <div className="flex items-center gap-2">
      {user.role === "client" && (
        <Link href="/panier" className="btn btn-ghost btn-sm" aria-label={`Panier, ${cartCount} article(s)`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
          </svg>
          <span className="hidden sm:inline">Panier</span>
          <span className="badge badge-secondary badge-sm">{cartCount}</span>
        </Link>
      )}
      <div className="dropdown dropdown-end">
        <div tabIndex={0} role="button" className="btn btn-ghost btn-sm" aria-haspopup="menu">
          <span className="max-w-32 truncate">{user.name}</span>
          <span className="badge badge-outline badge-sm hidden sm:inline-flex">{ROLE_LABELS[user.role]}</span>
        </div>
        <ul tabIndex={0} className="dropdown-content menu bg-base-100 text-base-content rounded-box border-base-300 z-40 mt-2 w-56 border p-2 shadow">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
          <li className="mt-1 border-base-300 border-t pt-1">
            <form action={logoutAction}>
              <button type="submit" className="w-full text-left">
                Se déconnecter
              </button>
            </form>
          </li>
        </ul>
      </div>
    </div>
  );
}
