import { afterEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

// Le module garde ses compteurs en mémoire : on nettoie les clés utilisées après chaque test.
const KEY = "login:test@example.com";
const OTHER = "login:autre@example.com";
const WINDOW = 60_000;
const T0 = 1_000_000;

afterEach(() => {
  resetRateLimit(KEY);
  resetRateLimit(OTHER);
});

describe("rateLimit", () => {
  it("autorise la première tentative", () => {
    expect(rateLimit(KEY, 3, WINDOW, T0)).toEqual({ allowed: true, retryAfterMs: 0 });
  });

  it("autorise exactement `limit` tentatives dans la fenêtre", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(KEY, 3, WINDOW, T0 + i).allowed).toBe(true);
    }
  });

  it("bloque la tentative suivante et indique le délai restant", () => {
    for (let i = 0; i < 3; i++) rateLimit(KEY, 3, WINDOW, T0);
    expect(rateLimit(KEY, 3, WINDOW, T0 + 10_000)).toEqual({ allowed: false, retryAfterMs: 50_000 });
  });

  it("reste bloqué tant que la fenêtre n'est pas écoulée", () => {
    for (let i = 0; i < 4; i++) rateLimit(KEY, 3, WINDOW, T0);
    expect(rateLimit(KEY, 3, WINDOW, T0 + WINDOW - 1)).toEqual({ allowed: false, retryAfterMs: 1 });
  });

  it("n'allonge pas la fenêtre avec les tentatives bloquées", () => {
    for (let i = 0; i < 10; i++) rateLimit(KEY, 3, WINDOW, T0 + i * 1000);
    expect(rateLimit(KEY, 3, WINDOW, T0 + 30_000).retryAfterMs).toBe(30_000);
  });

  it("ouvre une nouvelle fenêtre pile à l'échéance", () => {
    for (let i = 0; i < 5; i++) rateLimit(KEY, 3, WINDOW, T0);
    expect(rateLimit(KEY, 3, WINDOW, T0 + WINDOW)).toEqual({ allowed: true, retryAfterMs: 0 });
  });

  it("repart de zéro dans la nouvelle fenêtre", () => {
    for (let i = 0; i < 5; i++) rateLimit(KEY, 3, WINDOW, T0);
    const t1 = T0 + WINDOW + 5_000;
    for (let i = 0; i < 3; i++) expect(rateLimit(KEY, 3, WINDOW, t1).allowed).toBe(true);
    expect(rateLimit(KEY, 3, WINDOW, t1)).toEqual({ allowed: false, retryAfterMs: WINDOW });
  });

  it("compte chaque clé séparément", () => {
    for (let i = 0; i < 4; i++) rateLimit(KEY, 3, WINDOW, T0);
    expect(rateLimit(KEY, 3, WINDOW, T0).allowed).toBe(false);
    expect(rateLimit(OTHER, 3, WINDOW, T0).allowed).toBe(true);
  });

  it("utilise Date.now() quand `now` n'est pas fourni", () => {
    rateLimit(KEY, 1, WINDOW);
    const result = rateLimit(KEY, 1, WINDOW);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(WINDOW);
  });
});

describe("resetRateLimit", () => {
  it("débloque immédiatement une clé bloquée", () => {
    for (let i = 0; i < 4; i++) rateLimit(KEY, 3, WINDOW, T0);
    resetRateLimit(KEY);
    expect(rateLimit(KEY, 3, WINDOW, T0 + 1)).toEqual({ allowed: true, retryAfterMs: 0 });
  });

  it("n'affecte pas les autres clés", () => {
    for (let i = 0; i < 4; i++) rateLimit(OTHER, 3, WINDOW, T0);
    resetRateLimit(KEY);
    expect(rateLimit(OTHER, 3, WINDOW, T0).allowed).toBe(false);
  });

  it("ne plante pas sur une clé inconnue", () => {
    expect(() => resetRateLimit("inconnue")).not.toThrow();
  });
});
