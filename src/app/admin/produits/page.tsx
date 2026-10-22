import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductManageActions } from "@/components/product-admin-actions";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { listAllProducts } from "@/lib/data/products";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Produits" };

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminProductsPageContent />
    </Suspense>
  );
}

async function AdminProductsPageContent() {
  await requireRole(["admin"], "/admin/produits");
  const products = await listAllProducts();

  return (
    <>
      <PageHeader title="Produits" />
      {products.length === 0 ? (
        <EmptyState title="Aucun produit pour le moment." />
      ) : (
        <div className="bg-base-100 rounded-box border-base-300 overflow-x-auto border">
          <table className="table">
            <caption className="sr-only">Tous les produits</caption>
            <thead>
              <tr>
                <th scope="col">Produit</th>
                <th scope="col">Vendeur</th>
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
                    {p.is_active ? (
                      <Link href={`/produits/${p.id}`} className="link-hover font-semibold">
                        {p.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{p.name}</span>
                    )}
                    <div className="text-base-content/60 text-xs font-normal">{p.category}</div>
                  </th>
                  <td>{p.seller_name}</td>
                  <td>{formatPrice(p.price_cents)}</td>
                  <td>{p.stock}</td>
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
