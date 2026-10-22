import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductManageActions } from "@/components/product-admin-actions";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { listSellerProducts } from "@/lib/data/products";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Mes produits" };

export default function SellerProductsPage(props: PageProps<"/vendeur">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SellerProductsPageContent {...props} />
    </Suspense>
  );
}

async function SellerProductsPageContent({ searchParams }: PageProps<"/vendeur">) {
  const user = await requireRole(["vendeur"], "/vendeur");
  const [products, params] = await Promise.all([listSellerProducts(user.id), searchParams]);

  return (
    <>
      {params.enregistre === "1" && (
        <div role="status" className="alert alert-success alert-soft mb-4">
          <span>Produit enregistré.</span>
        </div>
      )}
      <PageHeader title="Mes produits">
        <Link href="/vendeur/commandes" className="btn btn-outline btn-sm">
          Commandes reçues
        </Link>
        <Link href="/vendeur/produits/nouveau" className="btn btn-primary btn-sm">
          + Nouveau produit
        </Link>
      </PageHeader>

      {products.length === 0 ? (
        <EmptyState title="Vous n'avez pas encore de produit.">
          <Link href="/vendeur/produits/nouveau" className="btn btn-primary">
            Ajouter mon premier produit
          </Link>
        </EmptyState>
      ) : (
        <div className="bg-base-100 rounded-box border-base-300 overflow-x-auto border">
          <table className="table">
            <caption className="sr-only">Vos produits</caption>
            <thead>
              <tr>
                <th scope="col">Produit</th>
                <th scope="col">Prix</th>
                <th scope="col">Stock</th>
                <th scope="col">Statut</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <th scope="row">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-base-content/60 text-xs font-normal">{p.category}</div>
                  </th>
                  <td>{formatPrice(p.price_cents)}</td>
                  <td>
                    {p.stock === 0 ? <span className="badge badge-error badge-soft">Rupture</span> : p.stock}
                  </td>
                  <td>
                    {p.is_active ? (
                      <span className="badge badge-success badge-soft">En vente</span>
                    ) : (
                      <span className="badge badge-ghost">Masqué</span>
                    )}
                  </td>
                  <td>
                    <ProductManageActions product={p} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
