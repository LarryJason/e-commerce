-- Images téléversées par les vendeurs (une par produit), servies par /images/produits/[id].
-- products.image_url pointe alors vers cette route ; il peut aussi rester une URL https externe.
CREATE TABLE product_images (
  product_id   INTEGER PRIMARY KEY REFERENCES products (id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  data         BYTEA NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
