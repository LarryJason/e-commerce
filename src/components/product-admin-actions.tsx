import Link from "next/link";
import { deleteProductAction, toggleProductActiveAction } from "@/app/actions/products";
import { ActionForm } from "@/components/action-form";

/** Actions de gestion d'un produit (vendeur propriétaire ou administrateur). */
export function ProductManageActions({ product }: { product: { id: number; name: string; is_active: boolean } }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Link href={`/vendeur/produits/${product.id}/modifier`} className="btn btn-sm btn-outline">
        Modifier
      </Link>
      <ActionForm
        action={toggleProductActiveAction}
        fields={{ productId: product.id }}
        submitLabel={product.is_active ? "Retirer de la vente" : "Remettre en vente"}
        submitClassName="btn btn-sm btn-ghost"
        showSuccess={false}
      />
      <ActionForm
        action={deleteProductAction}
        fields={{ productId: product.id }}
        submitLabel="Supprimer"
        submitClassName="btn btn-sm btn-ghost text-error"
        confirm={{
          title: "Supprimer ce produit ?",
          description: `« ${product.name} » sera définitivement supprimé et retiré des paniers. Les commandes déjà passées restent consultables.`,
          confirmLabel: "Supprimer",
          danger: true,
        }}
      />
    </div>
  );
}
