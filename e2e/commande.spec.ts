import { expect, test, type Page } from "@playwright/test";

// Compte de démonstration créé par `npm run db:seed`.
const CLIENT = { email: "client@boutique.test", password: "Client123!", name: "Claire Client" };
// Produit du seed avec un grand stock (120) : la commande est annulée en fin de test.
const PRODUCT = "Savon au karité";

async function fillLogin(page: Page, email: string, password: string) {
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

async function login(page: Page) {
  await page.goto("/connexion");
  await fillLogin(page, CLIENT.email, CLIENT.password);
  await expect(page.getByRole("link", { name: /^Panier,/ })).toBeVisible();
}

/** Le panier est stocké en base : on le vide pour partir d'un état connu. */
async function emptyCart(page: Page) {
  await page.goto("/panier");
  const removeButtons = page.getByRole("button", { name: "Retirer" });
  while ((await removeButtons.count()) > 0) {
    const before = await removeButtons.count();
    await removeButtons.first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Retirer" }).click();
    await expect(removeButtons).toHaveCount(before - 1);
  }
  await expect(page.getByText("Votre panier est vide.")).toBeVisible();
}

test.describe("Connexion", () => {
  test("refuse un mot de passe incorrect", async ({ page }) => {
    await page.goto("/connexion");
    await fillLogin(page, CLIENT.email, "MauvaisMotDePasse1");
    // Next.js ajoute sa propre zone role="alert" (annonce des changements de page) : on cible le formulaire.
    await expect(page.locator("form").getByRole("alert")).toHaveText("E-mail ou mot de passe incorrect.");
    await expect(page).toHaveURL(/\/connexion$/);
    await expect(page.getByLabel("Adresse e-mail")).toHaveValue(CLIENT.email);
  });

  test("connecte le client et le renvoie au catalogue", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: new RegExp(CLIENT.name) })).toBeVisible();
    await expect(page.getByRole("link", { name: "Connexion" })).toHaveCount(0);
  });

  test("redirige vers la page protégée demandée après connexion", async ({ page }) => {
    await page.goto("/panier");
    await expect(page).toHaveURL("/connexion?suivant=%2Fpanier");
    await fillLogin(page, CLIENT.email, CLIENT.password);
    await expect(page).toHaveURL("/panier");
    await expect(page.getByRole("heading", { name: "Mon panier" })).toBeVisible();
  });
});

test.describe("Commande", () => {
  test("ajoute un produit au panier, commande puis annule", async ({ page }) => {
    await login(page);
    await emptyCart(page);

    // Fiche produit → ajout au panier.
    await page.goto("/");
    await page.getByRole("link", { name: PRODUCT }).click();
    await expect(page.getByRole("heading", { level: 1, name: PRODUCT })).toBeVisible();
    await page.getByLabel("Quantité").fill("2");
    await page.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByText("Ajouté au panier (2 dans le panier).")).toBeVisible();
    await expect(page.getByRole("link", { name: "Panier, 2 article(s)" })).toBeVisible();

    // Panier.
    await page.getByRole("link", { name: /^Panier,/ }).click();
    await expect(page).toHaveURL("/panier");
    await expect(page.getByRole("link", { name: PRODUCT })).toBeVisible();
    await expect(page.getByLabel(`Quantité pour ${PRODUCT}`)).toHaveValue("2");
    const summary = page.getByRole("complementary", { name: "Récapitulatif" });
    await expect(summary.getByText("Articles").locator("..")).toContainText("2");
    const total = (await summary.getByText("Total").locator("..").locator("span").last().textContent())!.trim();
    expect(total).toMatch(/€/);

    // Adresse de livraison.
    await summary.getByRole("link", { name: "Passer la commande" }).click();
    await expect(page).toHaveURL("/commande");
    await expect(page.getByRole("complementary", { name: "Contenu de la commande" })).toContainText(`2 × ${PRODUCT}`);
    await expect(page.getByLabel("Nom du destinataire")).toHaveValue(CLIENT.name);
    await page.getByLabel("Adresse", { exact: true }).fill("12 rue des Lilas");
    await page.getByLabel("Code postal").fill("75011");
    await page.getByLabel("Ville").fill("Paris");
    await page.getByRole("button", { name: `Confirmer la commande (${total})` }).click();

    // Confirmation.
    await expect(page).toHaveURL(/\/commandes\/\d+\?confirmee=1$/);
    const orderId = page.url().match(/\/commandes\/(\d+)/)![1];
    await expect(page.getByRole("status").filter({ hasText: "Merci" })).toHaveText(
      `Merci ! Votre commande n° ${orderId} a bien été enregistrée.`,
    );
    await expect(page.getByRole("heading", { name: `Commande n° ${orderId}` })).toBeVisible();
    const row = page.getByRole("row", { name: new RegExp(PRODUCT) });
    await expect(row.getByRole("cell").nth(3)).toHaveText("2");
    await expect(page.locator("tfoot")).toContainText(total);
    await expect(page.locator("address")).toContainText("12 rue des Lilas");
    await expect(page.locator("address")).toContainText("75011 Paris");
    await expect(page.locator("p", { hasText: "Statut :" }).filter({ visible: true })).toContainText("En attente");
    await expect(page.getByRole("link", { name: "Panier, 0 article(s)" })).toBeVisible();

    // La commande apparaît dans l'historique.
    await page.goto("/commandes");
    const listRow = page.getByRole("row", { name: new RegExp(`N° ${orderId}\\b`) });
    await expect(listRow).toContainText(total);
    await expect(listRow).toContainText("En attente");

    // Nettoyage : l'annulation remet le stock en place.
    await listRow.getByRole("link", { name: `N° ${orderId}` }).click();
    await expect(page).toHaveURL(`/commandes/${orderId}`);
    await page.getByRole("button", { name: "Annuler la commande" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Annuler la commande" }).click();
    // La page est revalidée : le bouton (et son message de succès) disparaît, le statut change.
    // Next garde les pages déjà visitées dans le DOM (masquées) : on cible le statut visible.
    const status = page.locator("p", { hasText: "Statut :" }).filter({ visible: true });
    await expect(status).toContainText("Annulée");
    await expect(page.getByRole("button", { name: "Annuler la commande" })).toHaveCount(0);
  });
});
