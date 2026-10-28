import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OrderStatusSelect } from "@/components/order-status-select";
import { EmptyState, OrderStatusBadge, PageHeader, PageSkeleton } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { listAllOrders } from "@/lib/data/orders";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Commandes" };

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminOrdersPageContent />
    </Suspense>
  );
}

async function AdminOrdersPageContent() {
  await requireRole(["admin"], "/admin/commandes");
  const orders = await listAllOrders();

  return (
    <>
      <PageHeader title="Commandes" />
      {orders.length === 0 ? (
        <EmptyState title="Aucune commande pour le moment." />
      ) : (
        <div className="bg-base-100 rounded-box border-base-300 overflow-x-auto border">
          <table className="table">
            <caption className="sr-only">Toutes les commandes</caption>
            <thead>
              <tr>
                <th scope="col">Commande</th>
                <th scope="col">Client</th>
                <th scope="col">Date</th>
                <th scope="col">Total</th>
                <th scope="col">Statut</th>
                <th scope="col">Changer le statut</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <th scope="row">
                    <Link href={`/commandes/${o.id}`} className="link link-primary">
                      N° {o.id}
                    </Link>
                  </th>
                  <td>
                    {o.customer_name}
                    <div className="text-muted text-xs">{o.customer_email}</div>
                  </td>
                  <td className="whitespace-nowrap">{formatDate(o.created_at)}</td>
                  <td>{formatPrice(o.total_cents)}</td>
                  <td>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td>
                    <OrderStatusSelect orderId={o.id} status={o.status} />
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
