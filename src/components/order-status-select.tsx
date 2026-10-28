import { updateOrderStatusAction } from "@/app/actions/orders";
import { ActionForm } from "@/components/action-form";
import { allowedNextStatuses } from "@/lib/order-rules";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/roles";

/** Sélecteur de statut pour l'administrateur (seules les transitions valides sont proposées). */
export function OrderStatusSelect({ orderId, status }: { orderId: number; status: OrderStatus }) {
  const next = allowedNextStatuses(status);
  if (next.length === 0) return <span className="text-muted text-sm">Statut définitif</span>;
  return (
    <ActionForm
      key={status}
      action={updateOrderStatusAction}
      fields={{ orderId }}
      submitLabel="Appliquer"
      submitClassName="btn btn-sm btn-outline"
      confirm={{
        title: `Modifier le statut de la commande n° ${orderId} ?`,
        description:
          "Le client verra le nouveau statut. Une annulation remet les articles en stock et ne peut pas être annulée.",
      }}
    >
      <label htmlFor={`status-${orderId}`} className="sr-only">
        Nouveau statut de la commande n° {orderId}
      </label>
      <select id={`status-${orderId}`} name="status" className="select select-sm w-40" defaultValue={next[0]}>
        {next.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </ActionForm>
  );
}
