import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { removeCartItemAction, updateCartItemAction } from "@/app/actions/cart";
import { ActionForm } from "@/components/action-form";
import { EmptyState, PageHeader, PageSkeleton, ProductImage } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { summarizeCart } from "@/lib/cart-summary";
import { getCart } from "@/lib/data/cart";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Panier" };

export default function CartPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CartPageContent />
    </Suspense>
  );
}

async function CartPageContent() {
  const user = await requireRole(["client"], "/panier");
  const items = await getCart(user.id);
  const summary = summarizeCart(items);

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Mon panier" />
        <EmptyState title="Votre panier est vide.">
          <Link href="/" className="btn btn-primary">
            Parcourir le catalogue
          </Link>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Mon panier" />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const problem = !item.is_available
              ? "Ce produit n'est plus disponible : retirez-le pour commander."
              : item.quantity > item.stock
                ? `Seulement ${item.stock} en stock : réduisez la quantité.`
                : null;
            return (
              <li key={item.product_id} className="card card-side bg-base-100 border-base-300 border">
                <figure className="w-24 shrink-0 sm:w-32">
                  <ProductImage name={item.name} url={item.image_url} className="h-full min-h-24 w-full" />
                </figure>
                <div className="card-body gap-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">
                        {item.is_available ? (
                          <Link href={`/produits/${item.product_id}`} className="link-hover">
                            {item.name}
                          </Link>
                        ) : (
                          item.name
                        )}
                      </h2>
                      <p className="text-base-content/60 text-sm">
                        {formatPrice(item.price_cents)} · {item.seller_name}
                      </p>
                    </div>
                    <p className="font-semibold">{formatPrice(item.price_cents * item.quantity)}</p>
                  </div>
                  {problem && (
                    <p role="alert" className="text-error text-sm">
                      {problem}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {item.is_available && (
                      // La clé force la remise à zéro du champ quand la quantité change côté serveur.
                      <ActionForm
                        key={item.quantity}
                        action={updateCartItemAction}
                        fields={{ productId: item.product_id }}
                        submitLabel="Mettre à jour"
                        submitClassName="btn btn-sm btn-outline"
                        showSuccess={false}
                      >
                        <label htmlFor={`qty-${item.product_id}`} className="sr-only">
                          Quantité pour {item.name}
                        </label>
                        <input
                          id={`qty-${item.product_id}`}
                          name="quantity"
                          type="number"
                          min={1}
                          max={99}
                          defaultValue={item.quantity}
                          className="input input-sm w-20"
                        />
                      </ActionForm>
                    )}
                    <ActionForm
                      action={removeCartItemAction}
                      fields={{ productId: item.product_id }}
                      submitLabel="Retirer"
                      submitClassName="btn btn-sm btn-ghost text-error"
                      showSuccess={false}
                      confirm={{
                        title: "Retirer cet article ?",
                        description: `« ${item.name} » sera retiré de votre panier.`,
                        confirmLabel: "Retirer",
                        danger: true,
                      }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="card bg-base-100 border-base-300 h-fit border" aria-label="Récapitulatif">
          <div className="card-body">
            <h2 className="card-title">Récapitulatif</h2>
            <p className="flex justify-between">
              <span>Articles</span>
              <span>{summary.itemCount}</span>
            </p>
            <p className="flex justify-between">
              <span>Livraison</span>
              <span>Offerte</span>
            </p>
            <p className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(summary.totalCents)}</span>
            </p>
            {summary.canCheckout ? (
              <Link href="/commande" className="btn btn-primary mt-2">
                Passer la commande
              </Link>
            ) : (
              <p className="text-error text-sm">Corrigez les articles signalés pour pouvoir commander.</p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
