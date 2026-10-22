import { describe, expect, it } from "vitest";
import { type CartLine, summarizeCart } from "@/lib/cart-summary";

const line = (overrides: Partial<CartLine> = {}): CartLine => ({
  price_cents: 1000,
  quantity: 1,
  stock: 10,
  is_available: true,
  ...overrides,
});

describe("summarizeCart", () => {
  it("renvoie un panier vide non commandable", () => {
    expect(summarizeCart([])).toEqual({ totalCents: 0, itemCount: 0, canCheckout: false, problems: [] });
  });

  it("calcule le total et le nombre d'articles d'une seule ligne", () => {
    expect(summarizeCart([line({ price_cents: 1990, quantity: 3 })])).toEqual({
      totalCents: 5970,
      itemCount: 3,
      canCheckout: true,
      problems: [],
    });
  });

  it("additionne plusieurs lignes", () => {
    const summary = summarizeCart([
      line({ price_cents: 1000, quantity: 2 }),
      line({ price_cents: 250, quantity: 4 }),
      line({ price_cents: 1, quantity: 1 }),
    ]);
    expect(summary.totalCents).toBe(3001);
    expect(summary.itemCount).toBe(7);
    expect(summary.canCheckout).toBe(true);
  });

  it("accepte une quantité égale au stock", () => {
    const summary = summarizeCart([line({ quantity: 5, stock: 5 })]);
    expect(summary.problems).toEqual([]);
    expect(summary.canCheckout).toBe(true);
  });

  it("signale une quantité supérieure au stock", () => {
    const summary = summarizeCart([line({ quantity: 6, stock: 5 })]);
    expect(summary.problems).toEqual([0]);
    expect(summary.canCheckout).toBe(false);
  });

  it("signale un produit en rupture totale", () => {
    expect(summarizeCart([line({ quantity: 1, stock: 0 })]).problems).toEqual([0]);
  });

  it("signale un produit indisponible même si le stock suffit", () => {
    const summary = summarizeCart([line({ is_available: false, quantity: 1, stock: 10 })]);
    expect(summary.problems).toEqual([0]);
    expect(summary.canCheckout).toBe(false);
  });

  it("ne compte qu'une fois une ligne indisponible et hors stock", () => {
    expect(summarizeCart([line({ is_available: false, quantity: 3, stock: 1 })]).problems).toEqual([0]);
  });

  it("renvoie les index de toutes les lignes en défaut, dans l'ordre", () => {
    const summary = summarizeCart([
      line(),
      line({ is_available: false }),
      line(),
      line({ quantity: 11, stock: 10 }),
    ]);
    expect(summary.problems).toEqual([1, 3]);
    expect(summary.canCheckout).toBe(false);
  });

  it("inclut les lignes en défaut dans le total et le nombre d'articles", () => {
    const summary = summarizeCart([
      line({ price_cents: 500, quantity: 2 }),
      line({ price_cents: 300, quantity: 4, stock: 1 }),
    ]);
    expect(summary.totalCents).toBe(2200);
    expect(summary.itemCount).toBe(6);
  });

  it("ne modifie pas les lignes reçues", () => {
    const lines = [line({ quantity: 2 })];
    const copy = structuredClone(lines);
    summarizeCart(lines);
    expect(lines).toEqual(copy);
  });
});
