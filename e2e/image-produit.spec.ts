import { expect, test } from "@playwright/test";

// Compte de démonstration créé par `npm run db:seed`.
const SELLER = { email: "vendeur@boutique.test", password: "Vendeur123!" };

// PNG 1×1 valide : le serveur vérifie la signature du fichier, pas seulement son extension.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

test("un vendeur crée un produit avec une image visible dans le catalogue", async ({ page }) => {
  const name = `Produit image ${Date.now()}`;

  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(SELLER.email);
  await page.getByLabel("Mot de passe").fill(SELLER.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/vendeur$/);

  await page.goto("/vendeur/produits/nouveau");
  await page.getByLabel("Nom du produit").fill(name);
  await page.getByLabel("Catégorie").fill("Maison");
  await page.getByLabel("Prix (€)").fill("12,50");
  await page.getByLabel("Stock").fill("5");
  await page.getByLabel("Téléverser une image").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByAltText("Aperçu de l'image du produit")).toBeVisible();
  await page.getByRole("button", { name: "Créer le produit" }).click();
  await expect(page.getByText("Produit enregistré.")).toBeVisible();

  // Dans le catalogue, la carte affiche l'image téléversée (et non la vignette générée).
  await page.goto(`/?q=${encodeURIComponent(name)}`);
  const image = page.getByRole("img", { name });
  await expect(image).toHaveAttribute("src", /^\/images\/produits\/\d+\?v=\d+$/);
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(1);

  // Nettoyage : le produit de test est supprimé.
  await page.goto("/vendeur");
  const row = page.getByRole("row", { name: new RegExp(name) });
  await row.getByRole("button", { name: "Supprimer" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);
});
