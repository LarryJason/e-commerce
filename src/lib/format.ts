const priceFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export function formatPrice(cents: number) {
  return priceFormatter.format(cents / 100);
}

/** Valeur à afficher dans un champ de saisie de prix ("1990" → "19,90"). */
export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function formatDate(date: Date | string) {
  return dateFormatter.format(new Date(date));
}
