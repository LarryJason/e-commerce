// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveProductAction } from "@/app/actions/products";
import { ProductForm, type ProductFormValues } from "@/components/product-form";
import { MAX_IMAGE_BYTES } from "@/lib/product-image";

// La Server Action touche la base et l'authentification : on la remplace.
vi.mock("@/app/actions/products", () => ({ saveProductAction: vi.fn() }));
const saveMock = vi.mocked(saveProductAction);

const existing: ProductFormValues = {
  id: 42,
  name: "Chaise en chêne",
  description: "Assise confortable",
  category: "Mobilier",
  price: "89,90",
  stock: "7",
  imageUrl: "https://cdn.example.com/chaise.jpg",
  isActive: false,
};

const pngFile = (size = 1024) => {
  const file = new File(["x"], "photo.png", { type: "image/png" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

const renderForm = (product?: ProductFormValues) =>
  render(<ProductForm product={product} categories={["Mobilier", "Déco"]} cancelHref="/vendeur/produits" />);

const fileInput = () => screen.getByLabelText("Téléverser une image") as HTMLInputElement;

beforeEach(() => {
  saveMock.mockReset();
  URL.createObjectURL = vi.fn(() => "blob:preview-1");
  URL.revokeObjectURL = vi.fn();
});

afterEach(cleanup);

describe("ProductForm — création", () => {
  it("affiche des champs vides avec un stock à 0", () => {
    renderForm();
    expect(screen.getByLabelText("Nom du produit")).toHaveValue("");
    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(screen.getByLabelText("Catégorie")).toHaveValue("");
    expect(screen.getByLabelText("Prix (€)")).toHaveValue("");
    expect(screen.getByLabelText("Stock")).toHaveValue(0);
    expect(screen.getByLabelText("…ou URL d'une image")).toHaveValue("");
  });

  it("rend le produit visible par défaut et propose de le créer", () => {
    const { container } = renderForm();
    expect(screen.getByLabelText("Visible dans le catalogue")).toBeChecked();
    expect(screen.getByRole("button", { name: "Créer le produit" })).toBeInTheDocument();
    expect(container.querySelector('input[name="productId"]')).toBeNull();
  });

  it("propose les catégories existantes en suggestion", () => {
    const { container } = renderForm();
    const options = [...container.querySelectorAll("datalist#categories option")].map((o) => o.getAttribute("value"));
    expect(options).toEqual(["Mobilier", "Déco"]);
    expect(screen.getByLabelText("Catégorie")).toHaveAttribute("list", "categories");
  });

  it("pointe le lien Annuler vers cancelHref", () => {
    renderForm();
    expect(screen.getByRole("link", { name: "Annuler" })).toHaveAttribute("href", "/vendeur/produits");
  });

  it("n'accepte que les formats d'image autorisés", () => {
    renderForm();
    expect(fileInput()).toHaveAttribute("accept", "image/jpeg,image/png,image/webp,image/gif");
  });
});

describe("ProductForm — modification", () => {
  it("pré-remplit les valeurs du produit", () => {
    renderForm(existing);
    expect(screen.getByLabelText("Nom du produit")).toHaveValue("Chaise en chêne");
    expect(screen.getByLabelText("Description")).toHaveValue("Assise confortable");
    expect(screen.getByLabelText("Catégorie")).toHaveValue("Mobilier");
    expect(screen.getByLabelText("Prix (€)")).toHaveValue("89,90");
    expect(screen.getByLabelText("Stock")).toHaveValue(7);
    expect(screen.getByLabelText("Visible dans le catalogue")).not.toBeChecked();
  });

  it("envoie l'identifiant du produit et adapte le bouton", () => {
    const { container } = renderForm(existing);
    expect(container.querySelector('input[name="productId"]')).toHaveValue("42");
    expect(screen.getByRole("button", { name: "Enregistrer les modifications" })).toBeInTheDocument();
  });

  it("affiche une URL externe dans le champ URL, sans aperçu ni case de suppression", () => {
    renderForm(existing);
    expect(screen.getByLabelText("…ou URL d'une image")).toHaveValue("https://cdn.example.com/chaise.jpg");
    expect(screen.queryByAltText("Aperçu de l'image du produit")).toBeNull();
    expect(screen.queryByLabelText("Supprimer l'image actuelle")).toBeNull();
  });

  it("affiche une image téléversée à part, avec la case de suppression", () => {
    renderForm({ ...existing, imageUrl: "/images/produits/42?v=1" });
    expect(screen.getByLabelText("…ou URL d'une image")).toHaveValue("");
    expect(screen.getByAltText("Aperçu de l'image du produit")).toHaveAttribute("src", "/images/produits/42?v=1");
    expect(screen.getByLabelText("Supprimer l'image actuelle")).not.toBeChecked();
    expect(screen.getByText(/Choisissez un fichier pour remplacer l'image actuelle/)).toBeInTheDocument();
  });
});

describe("ProductForm — sélection d'image", () => {
  it("affiche un aperçu local du fichier choisi", async () => {
    renderForm();
    await userEvent.upload(fileInput(), pngFile());
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(screen.getByAltText("Aperçu de l'image du produit")).toHaveAttribute("src", "blob:preview-1");
  });

  it("remplace l'image téléversée par l'aperçu et masque la case de suppression", async () => {
    renderForm({ ...existing, imageUrl: "/images/produits/42?v=1" });
    await userEvent.upload(fileInput(), pngFile());
    expect(screen.getByAltText("Aperçu de l'image du produit")).toHaveAttribute("src", "blob:preview-1");
    expect(screen.queryByLabelText("Supprimer l'image actuelle")).toBeNull();
  });

  it("accepte un fichier de exactement 2 Mo", async () => {
    renderForm();
    await userEvent.upload(fileInput(), pngFile(MAX_IMAGE_BYTES));
    expect(screen.queryByText("L'image ne doit pas dépasser 2 Mo.")).toBeNull();
    expect(screen.getByAltText("Aperçu de l'image du produit")).toBeInTheDocument();
  });

  it("refuse un fichier trop lourd sans l'envoyer", async () => {
    renderForm();
    const input = fileInput();
    await userEvent.upload(input, pngFile(MAX_IMAGE_BYTES + 1));
    expect(screen.getByText("L'image ne doit pas dépasser 2 Mo.")).toHaveAttribute("id", "field-imageFile-error");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "field-imageFile-hint field-imageFile-error");
    expect(input).toHaveClass("file-input-error");
    expect(input.value).toBe("");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(screen.queryByAltText("Aperçu de l'image du produit")).toBeNull();
  });

  it("efface l'erreur quand un fichier valide est choisi ensuite", async () => {
    renderForm();
    await userEvent.upload(fileInput(), pngFile(MAX_IMAGE_BYTES + 1));
    await userEvent.upload(fileInput(), pngFile());
    expect(screen.queryByText("L'image ne doit pas dépasser 2 Mo.")).toBeNull();
    expect(fileInput()).not.toHaveAttribute("aria-invalid");
  });

  it("libère l'URL de l'aperçu précédent quand on change de fichier", async () => {
    vi.mocked(URL.createObjectURL).mockReturnValueOnce("blob:preview-1").mockReturnValueOnce("blob:preview-2");
    renderForm();
    await userEvent.upload(fileInput(), pngFile());
    await userEvent.upload(fileInput(), pngFile());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
    expect(screen.getByAltText("Aperçu de l'image du produit")).toHaveAttribute("src", "blob:preview-2");
  });

  it("libère l'URL de l'aperçu au démontage", async () => {
    const { unmount } = renderForm();
    await userEvent.upload(fileInput(), pngFile());
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
  });
});

describe("ProductForm — soumission", () => {
  it("envoie les champs saisis à la Server Action", async () => {
    saveMock.mockResolvedValue({ status: "success", message: "Produit créé." });
    renderForm();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Nom du produit"), "Lampe");
    await user.type(screen.getByLabelText("Catégorie"), "Déco");
    await user.type(screen.getByLabelText("Prix (€)"), "19,90");
    await user.click(screen.getByRole("button", { name: "Créer le produit" }));

    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    const [prevState, formData] = saveMock.mock.calls[0];
    expect(prevState).toEqual({ status: "idle" });
    expect(formData.get("name")).toBe("Lampe");
    expect(formData.get("category")).toBe("Déco");
    expect(formData.get("price")).toBe("19,90");
    expect(formData.get("stock")).toBe("0");
    expect(formData.get("isActive")).toBe("on");
    expect(await screen.findByRole("alert")).toHaveTextContent("Produit créé.");
  });

  it("réaffiche la saisie et les erreurs renvoyées par le serveur", async () => {
    saveMock.mockResolvedValue({
      status: "error",
      message: "Le formulaire contient des erreurs.",
      fieldErrors: { price: ["Prix invalide."], description: ["Trop longue."], imageFile: ["Format non pris en charge."] },
      values: { name: "Lampe", description: "x", category: "Déco", price: "abc", stock: "3", imageUrl: "" },
    });
    renderForm(existing);
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Le formulaire contient des erreurs.");
    expect(screen.getByLabelText("Nom du produit")).toHaveValue("Lampe");
    expect(screen.getByLabelText("Prix (€)")).toHaveValue("abc");
    expect(screen.getByLabelText("Prix (€)")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Prix invalide.")).toBeInTheDocument();

    const description = screen.getByLabelText("Description");
    expect(description).toHaveValue("x");
    expect(description).toHaveAttribute("aria-invalid", "true");
    expect(description).toHaveAttribute("aria-describedby", "field-description-error");
    expect(description).toHaveClass("textarea-error");
    expect(screen.getByText("Trop longue.")).toBeInTheDocument();

    expect(fileInput()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Format non pris en charge.")).toBeInTheDocument();
  });

  it("donne la priorité à l'erreur locale de fichier sur celle du serveur", async () => {
    saveMock.mockResolvedValue({
      status: "error",
      message: "Erreur.",
      fieldErrors: { imageFile: ["Format non pris en charge."] },
    });
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Créer le produit" }));
    await screen.findByText("Format non pris en charge.");

    await userEvent.upload(fileInput(), pngFile(MAX_IMAGE_BYTES + 1));
    expect(screen.getByText("L'image ne doit pas dépasser 2 Mo.")).toBeInTheDocument();
    expect(screen.queryByText("Format non pris en charge.")).toBeNull();
  });
});
