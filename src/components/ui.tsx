import type { ReactNode } from "react";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/roles";

const STATUS_CLASSES: Record<OrderStatus, string> = {
  en_attente: "badge-warning",
  confirmee: "badge-info",
  expediee: "badge-info",
  livree: "badge-success",
  annulee: "badge-neutral",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge-soft ${STATUS_CLASSES[status]}`}>{ORDER_STATUS_LABELS[status]}</span>;
}

/** Image du produit, ou vignette générée à partir de son nom. */
export function ProductImage({ name, url, className = "" }: { name: string; url: string | null; className?: string }) {
  if (url) {
    // Les images proviennent d'URL saisies par les vendeurs (domaines variés) : <img> simple.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={`object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div
      className={`bg-secondary flex items-center justify-center ${className}`}
      role="img"
      aria-label={name}
    >
      <span className="text-primary/70 text-4xl font-bold" aria-hidden="true">
        {name.slice(0, 1).toUpperCase()}
      </span>
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="bg-base-200 rounded-box flex flex-col items-center gap-3 p-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <div className="skeleton h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
