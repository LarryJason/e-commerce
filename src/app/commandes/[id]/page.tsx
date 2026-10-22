import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cancelMyOrderAction } from "@/app/actions/orders";
import { ActionForm } from "@/components/action-form";
import { OrderStatusSelect } from "@/components/order-status-select";
import { OrderStatusBadge, PageHeader, PageSkeleton } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { getOrder, getOrderItems } from "@/lib/data/orders";
import { formatDate, formatPrice } from "@/lib/format";
import { canCustomerCancel } from "@/lib/order-rules";
import { idSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Détail de la commande" };

export default function OrderPage(props: PageProps<"/commandes/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrderPageContent {...props} />
    </Suspense>
  );
}

async function OrderPageContent({ params, searchParams }: PageProps<"/commandes/[id]">) {
  const { id: rawId } = await params;
  const user = await requireRole(["client", "admin"], `/commandes/${rawId}`);
  const id = idSchema.safeParse(rawId);
  if (!id.success) notFound();

  const order = await getOrder(id.data);
  // Un client ne voit que ses commandes ; on répond 404 pour ne rien révéler des autres.
  if (!order || (user.role !== "admin" && order.user_id !== user.id)) notFound();
  const items = await getOrderItems(order.id);
  const justPlaced = (await searchParams).confirmee === "1";

  return (
    <>
      {justPlaced && (
        <div role="status" className="alert alert-success mb-6">
          <span>Merci ! Votre commande n° {order.id} a bien été enregistrée.</span>
        </div>
      )}
      <PageHeader title={`Commande n° ${order.id}`}>
        <Link href={user.role === "admin" ? "/admin/commandes" : "/commandes"} className="btn btn-ghost btn-sm">
          ← Retour aux commandes
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="bg-base-100 rounded-box border-base-300 overflow-x-auto border" aria-label="Articles">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Produit</th>
                <th scope="col">Vendeur</th>
                <th scope="col">Prix unitaire</th>
                <th scope="col">Qté</th>
                <th scope="col" className="text-right">
                  Sous-total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.product_name}</td>
                  <td>{item.seller_name}</td>
                  <td>{formatPrice(item.unit_price_cents)}</td>
                  <td>{item.quantity}</td>
                  <td className="text-right">{formatPrice(item.unit_price_cents * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={4}>Total</th>
                <th className="text-right">{formatPrice(order.total_cents)}</th>
              </tr>
            </tfoot>
          </table>
        </section>

        <aside className="card bg-base-100 border-base-300 h-fit border">
          <div className="card-body gap-3">
            <p>
              Statut : <OrderStatusBadge status={order.status} />
            </p>
            <p className="text-sm">Passée le {formatDate(order.created_at)}</p>
            {user.role === "admin" && (
              <p className="text-sm">
                Client : {order.customer_name} ({order.customer_email})
              </p>
            )}
            <div>
              <h2 className="font-semibold">Livraison</h2>
              <address className="text-sm not-italic">
                {order.shipping_name}
                <br />
                {order.shipping_address}
                <br />
                {order.shipping_postal_code} {order.shipping_city}
              </address>
            </div>
            {user.role === "client" && canCustomerCancel(order.status) && (
              <ActionForm
                action={cancelMyOrderAction}
                fields={{ orderId: order.id }}
                submitLabel="Annuler la commande"
                submitClassName="btn btn-outline btn-error btn-sm"
                confirm={{
                  title: "Annuler cette commande ?",
                  description: "La commande sera annulée et les articles remis en vente. Cette action est définitive.",
                  confirmLabel: "Annuler la commande",
                  danger: true,
                }}
              />
            )}
            {user.role === "admin" && <OrderStatusSelect orderId={order.id} status={order.status} />}
          </div>
        </aside>
      </div>
    </>
  );
}
