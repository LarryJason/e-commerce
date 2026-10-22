import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { getAdminStats } from "@/lib/data/users";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Administration" };

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminDashboardPageContent />
    </Suspense>
  );
}

async function AdminDashboardPageContent() {
  await requireRole(["admin"], "/admin");
  const stats = await getAdminStats();

  const sections = [
    { href: "/admin/utilisateurs", title: "Utilisateurs", text: "Rôles, activation et désactivation des comptes." },
    { href: "/admin/produits", title: "Produits", text: "Modifier, masquer ou supprimer n'importe quel produit." },
    { href: "/admin/commandes", title: "Commandes", text: "Suivre et faire évoluer le statut des commandes." },
  ];

  return (
    <>
      <PageHeader title="Tableau de bord" />
      <div className="stats stats-vertical sm:stats-horizontal bg-base-100 border-base-300 mb-6 w-full border">
        <div className="stat">
          <div className="stat-title">Utilisateurs</div>
          <div className="stat-value">{stats.users}</div>
          <div className="stat-desc">dont {stats.sellers} vendeur(s)</div>
        </div>
        <div className="stat">
          <div className="stat-title">Produits</div>
          <div className="stat-value">{stats.products}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Commandes</div>
          <div className="stat-value">{stats.orders}</div>
          <div className="stat-desc">{stats.pending_orders} en attente</div>
        </div>
        <div className="stat">
          <div className="stat-title">Chiffre d&apos;affaires</div>
          <div className="stat-value text-2xl">{formatPrice(stats.revenue_cents)}</div>
          <div className="stat-desc">hors commandes annulées</div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="card bg-base-100 border-base-300 border transition hover:shadow-md">
            <div className="card-body">
              <h2 className="card-title">{s.title}</h2>
              <p className="text-base-content/70 text-sm">{s.text}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
