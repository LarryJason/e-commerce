import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, OrderStatusBadge, PageHeader, PageSkeleton } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { listUserOrders } from "@/lib/data/orders";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Mes commandes" };

export default function MyOrdersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyOrdersPageContent />
    </Suspense>
  );
}

async function MyOrdersPageContent() {
  const user = await requireRole(["client"], "/commandes");
  const orders = await listUserOrders(user.id);

  return (
    <>
      <PageHeader title="Mes commandes" />
      {orders.length === 0 ? (
        <EmptyState title="Vous n'avez encore passé aucune commande.">
          <Link href="/" className="btn btn-primary">
            Découvrir le catalogue
          </Link>
        </EmptyState>
      ) : (
        <div className="bg-base-100 rounded-box border-base-300 overflow-x-auto border">
          <table className="table">
            <caption className="sr-only">Historique de vos commandes</caption>
            <thead>
              <tr>
                <th scope="col">Commande</th>
                <th scope="col">Date</th>
                <th scope="col">Articles</th>
                <th scope="col">Total</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <th scope="row">
                    <Link href={`/commandes/${order.id}`} className="link link-primary">
                      N° {order.id}
                    </Link>
                  </th>
                  <td>{formatDate(order.created_at)}</td>
                  <td>{order.item_count}</td>
                  <td>{formatPrice(order.total_cents)}</td>
                  <td>
                    <OrderStatusBadge status={order.status} />
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
