import type { OrderStatus } from "@/lib/roles";

/** Transitions de statut autorisées (les statuts « livree » et « annulee » sont définitifs). */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  en_attente: ["confirmee", "expediee", "annulee"],
  confirmee: ["expediee", "annulee"],
  expediee: ["livree"],
  livree: [],
  annulee: [],
};

export function allowedNextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return TRANSITIONS[from].includes(to);
}

/** Un client ne peut annuler lui-même qu'une commande pas encore traitée. */
export function canCustomerCancel(status: OrderStatus) {
  return status === "en_attente";
}
