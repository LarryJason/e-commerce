export const ROLES = ["client", "vendeur", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  client: "Client",
  vendeur: "Vendeur",
  admin: "Administrateur",
};

/** Page d'accueil de l'espace propre à chaque rôle. */
export const ROLE_HOME: Record<Role, string> = {
  client: "/",
  vendeur: "/vendeur",
  admin: "/admin",
};

export const ORDER_STATUSES = ["en_attente", "confirmee", "expediee", "livree", "annulee"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  expediee: "Expédiée",
  livree: "Livrée",
  annulee: "Annulée",
};
