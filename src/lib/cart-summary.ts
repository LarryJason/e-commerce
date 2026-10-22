export type CartLine = {
  price_cents: number;
  quantity: number;
  stock: number;
  is_available: boolean;
};

/** Total du panier et détection des lignes qui empêchent de commander. */
export function summarizeCart(lines: CartLine[]) {
  let totalCents = 0;
  let itemCount = 0;
  const problems: number[] = [];
  lines.forEach((line, index) => {
    totalCents += line.price_cents * line.quantity;
    itemCount += line.quantity;
    if (!line.is_available || line.quantity > line.stock) problems.push(index);
  });
  return { totalCents, itemCount, canCheckout: lines.length > 0 && problems.length === 0, problems };
}
