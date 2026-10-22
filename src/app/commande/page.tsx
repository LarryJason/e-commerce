import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { summarizeCart } from "@/lib/cart-summary";
import { getCart } from "@/lib/data/cart";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Commande" };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CheckoutPageContent />
    </Suspense>
  );
}

async function CheckoutPageContent() {
  const user = await requireRole(["client"], "/commande");
  const items = await getCart(user.id);
  const summary = summarizeCart(items);
  if (!summary.canCheckout) redirect("/panier");

  return (
    <>
      <PageHeader title="Finaliser ma commande" />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="card bg-base-100 border-base-300 border" aria-labelledby="livraison">
          <div className="card-body">
            <h2 id="livraison" className="card-title">
              Adresse de livraison
            </h2>
            <CheckoutForm defaultName={user.name} totalLabel={formatPrice(summary.totalCents)} />
          </div>
        </section>
        <aside className="card bg-base-100 border-base-300 h-fit border" aria-label="Contenu de la commande">
          <div className="card-body">
            <h2 className="card-title">Votre commande</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {items.map((item) => (
                <li key={item.product_id} className="flex justify-between gap-2">
                  <span>
                    {item.quantity} × {item.name}
                  </span>
                  <span>{formatPrice(item.price_cents * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <p className="border-base-300 mt-2 flex justify-between border-t pt-2 text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(summary.totalCents)}</span>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
