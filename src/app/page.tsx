import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageSkeleton, ProductImage } from "@/components/ui";
import { listCatalog, listCategories } from "@/lib/data/products";
import { formatPrice } from "@/lib/format";

function param(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 100) ?? "";
}

export default function CatalogPage(props: PageProps<"/">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CatalogPageContent {...props} />
    </Suspense>
  );
}

async function CatalogPageContent({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const search = param(params.q);
  const category = param(params.categorie);
  const [products, categories] = await Promise.all([
    listCatalog({ search: search || undefined, category: category || undefined }),
    listCategories(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="hero bg-primary text-primary-content rounded-box">
        <div className="hero-content py-10 text-center">
          <div className="max-w-xl">
            <h1 className="text-3xl font-bold sm:text-4xl">Des créations uniques, livrées chez vous</h1>
            <p className="text-primary-content/80 py-4">
              Parcourez les produits de nos vendeurs indépendants et commandez en quelques clics.
            </p>
          </div>
        </div>
      </section>

      <form role="search" method="get" className="flex flex-col gap-2 sm:flex-row" aria-label="Rechercher dans le catalogue">
        <label className="input w-full sm:flex-1">
          <span className="sr-only">Rechercher un produit</span>
          <input type="search" name="q" defaultValue={search} placeholder="Rechercher un produit…" maxLength={100} />
        </label>
        <label className="sr-only" htmlFor="categorie">
          Catégorie
        </label>
        <select id="categorie" name="categorie" defaultValue={category} className="select w-full sm:w-56">
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          Rechercher
        </button>
      </form>

      <h2 className="sr-only">Produits</h2>
      <p className="text-muted text-sm" aria-live="polite">
        {products.length} produit(s){search && ` pour « ${search} »`}
        {category && ` dans « ${category} »`}
        {(search || category) && (
          <>
            {" — "}
            <Link href="/" className="link">
              réinitialiser
            </Link>
          </>
        )}
      </p>

      {products.length === 0 ? (
        <EmptyState title="Aucun produit ne correspond à votre recherche." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.id} className="card bg-base-100 border-base-300 relative border shadow-sm transition hover:shadow-md">
              <figure>
                <ProductImage name={product.name} url={product.image_url} className="h-44 w-full" />
              </figure>
              <div className="card-body gap-2 p-4">
                <p className="text-muted text-xs tracking-wide uppercase">{product.category}</p>
                <h3 className="card-title text-base">
                  <Link href={`/produits/${product.id}`} className="after:absolute after:inset-0">
                    {product.name}
                  </Link>
                </h3>
                <p className="text-muted text-sm">par {product.seller_name}</p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-lg font-semibold">{formatPrice(product.price_cents)}</span>
                  {product.stock > 0 ? (
                    <span className="badge badge-success badge-soft">En stock</span>
                  ) : (
                    <span className="badge badge-ghost">Rupture</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
