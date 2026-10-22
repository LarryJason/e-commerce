import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductForm } from "@/components/product-form";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { listCategories } from "@/lib/data/products";

export const metadata: Metadata = { title: "Nouveau produit" };

export default function NewProductPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewProductPageContent />
    </Suspense>
  );
}

async function NewProductPageContent() {
  await requireRole(["vendeur"], "/vendeur/produits/nouveau");
  const categories = await listCategories();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nouveau produit" />
      <div className="card bg-base-100 border-base-300 border">
        <div className="card-body">
          <ProductForm categories={categories} cancelHref="/vendeur" />
        </div>
      </div>
    </div>
  );
}
