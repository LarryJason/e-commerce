import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { addToCartAction } from "@/app/actions/cart";
import { ActionForm } from "@/components/action-form";
import { PageSkeleton, ProductImage } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicProduct } from "@/lib/data/products";
import { formatPrice } from "@/lib/format";
import { idSchema } from "@/lib/validation";

export default function ProductPage(props: PageProps<"/produits/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProductPageContent {...props} />
    </Suspense>
  );
}

async function ProductPageContent({ params }: PageProps<"/produits/[id]">) {
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [product, user] = await Promise.all([getPublicProduct(id.data), getCurrentUser()]);
  if (!product) notFound();

  const inStock = product.stock > 0;

  return (
    <article className="flex flex-col gap-6">
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link href="/">Catalogue</Link>
          </li>
          <li>
            <Link href={`/?categorie=${encodeURIComponent(product.category)}`}>{product.category}</Link>
          </li>
          <li aria-current="page">{product.name}</li>
        </ul>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductImage name={product.name} url={product.image_url} className="rounded-box aspect-square w-full" />

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-base-content/70 mt-1">Vendu par {product.seller_name}</p>
          </div>
          <p className="text-3xl font-semibold">{formatPrice(product.price_cents)}</p>
          <p>
            {inStock ? (
              <span className="badge badge-success badge-soft">{product.stock} en stock</span>
            ) : (
              <span className="badge badge-ghost">Rupture de stock</span>
            )}
          </p>
          {product.description && <p className="leading-relaxed whitespace-pre-line">{product.description}</p>}

          <div className="card bg-base-100 border-base-300 border">
            <div className="card-body">
              {!user ? (
                <p>
                  <Link href={`/connexion?suivant=/produits/${product.id}`} className="link link-primary">
                    Connectez-vous
                  </Link>{" "}
                  ou{" "}
                  <Link href="/inscription" className="link link-primary">
                    créez un compte client
                  </Link>{" "}
                  pour commander ce produit.
                </p>
              ) : user.role !== "client" ? (
                <p className="text-base-content/70">Seuls les comptes clients peuvent passer commande.</p>
              ) : !inStock ? (
                <p className="text-base-content/70">Ce produit n&apos;est pas disponible pour le moment.</p>
              ) : (
                <ActionForm
                  action={addToCartAction}
                  fields={{ productId: product.id }}
                  submitLabel="Ajouter au panier"
                  submitClassName="btn btn-primary"
                  className="flex flex-wrap items-end gap-3"
                >
                  <fieldset className="fieldset">
                    <label htmlFor="quantity" className="fieldset-legend">
                      Quantité
                    </label>
                    <input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min={1}
                      max={Math.min(product.stock, 99)}
                      defaultValue={1}
                      required
                      className="input w-24"
                    />
                  </fieldset>
                </ActionForm>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
