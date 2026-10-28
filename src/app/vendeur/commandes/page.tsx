import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, OrderStatusBadge, PageHeader, PageSkeleton } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { listSellerOrders } from "@/lib/data/orders";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Commandes reçues" };

export default function SellerOrdersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SellerOrdersPageContent />
    </Suspense>
  );
}

async function SellerOrdersPageContent() {
  const user = await requireRole(["vendeur"], "/vendeur/commandes");
  const orders = await listSellerOrders(user.id);

  return (
    <>
      <PageHeader title="Commandes reçues">
        <Link href="/vendeur" className="btn btn-ghost btn-sm">
          ← Mes produits
        </Link>
      </PageHeader>
      <p className="text-muted mb-4 text-sm">
        Seuls vos articles sont affichés pour chaque commande.
      </p>

      {orders.length === 0 ? (
        <EmptyState title="Aucune commande ne contient encore vos produits." />
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => (
            <li key={order.id} className="card bg-base-100 border-base-300 border">
              <div className="card-body gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="card-title text-lg">Commande n° {order.id}</h2>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="text-muted text-sm">
                  {formatDate(order.created_at)} · Livraison à {order.shipping_name}, {order.shipping_postal_code}{" "}
                  {order.shipping_city}
                </p>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th scope="col">Article</th>
                        <th scope="col">Qté</th>
                        <th scope="col" className="text-right">
                          Montant
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.product_name}</td>
                          <td>{item.quantity}</td>
                          <td className="text-right">{formatPrice(item.unit_price_cents * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th colSpan={2}>Vos ventes</th>
                        <th className="text-right">{formatPrice(order.seller_total_cents)}</th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
