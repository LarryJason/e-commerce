import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductForm } from "@/components/product-form";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { getProduct, listCategories } from "@/lib/data/products";
import { centsToInput } from "@/lib/format";
import { idSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Modifier le produit" };

export default function EditProductPage(props: PageProps<"/vendeur/produits/[id]/modifier">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditProductPageContent {...props} />
    </Suspense>
  );
}

async function EditProductPageContent({ params }: PageProps<"/vendeur/produits/[id]/modifier">) {
  const { id: rawId } = await params;
  const user = await requireRole(["vendeur", "admin"], `/vendeur/produits/${rawId}/modifier`);
  const id = idSchema.safeParse(rawId);
  if (!id.success) notFound();

  const [product, categories] = await Promise.all([getProduct(id.data), listCategories()]);
  // Un vendeur ne peut modifier que ses propres produits.
  if (!product || (user.role !== "admin" && product.seller_id !== user.id)) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Modifier « ${product.name} »`} />
      {user.role === "admin" && <p className="text-base-content/70 mb-4 text-sm">Vendeur : {product.seller_name}</p>}
      <div className="card bg-base-100 border-base-300 border">
        <div className="card-body">
          <ProductForm
            categories={categories}
            cancelHref={user.role === "admin" ? "/admin/produits" : "/vendeur"}
            product={{
              id: product.id,
              name: product.name,
              description: product.description,
              category: product.category,
              price: centsToInput(product.price_cents),
              stock: String(product.stock),
              imageUrl: product.image_url ?? "",
              isActive: product.is_active,
            }}
          />
        </div>
      </div>
    </div>
  );
}
