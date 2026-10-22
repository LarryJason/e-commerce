-- Schéma initial de la boutique.
-- Les montants sont stockés en centimes (entiers) pour éviter les erreurs d'arrondi.

CREATE TYPE user_role AS ENUM ('client', 'vendeur', 'admin');
CREATE TYPE order_status AS ENUM ('en_attente', 'confirmee', 'expediee', 'livree', 'annulee');

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'client',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

-- Le jeton de session n'est jamais stocké : seul son HMAC l'est.
CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  seller_id   INTEGER NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL CHECK (char_length(category) BETWEEN 2 AND 60),
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_seller_id_idx ON products (seller_id);
CREATE INDEX products_category_idx ON products (category);

CREATE TABLE cart_items (
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE orders (
  id                   SERIAL PRIMARY KEY,
  user_id              INTEGER NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  status               order_status NOT NULL DEFAULT 'en_attente',
  total_cents          INTEGER NOT NULL CHECK (total_cents >= 0),
  shipping_name        TEXT NOT NULL,
  shipping_address     TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  shipping_city        TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_id_idx ON orders (user_id);

-- Les lignes conservent un instantané du nom et du prix au moment de la commande.
CREATE TABLE order_items (
  id               SERIAL PRIMARY KEY,
  order_id         INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id       INTEGER REFERENCES products (id) ON DELETE SET NULL,
  seller_id        INTEGER NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  product_name     TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
  quantity         INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE INDEX order_items_order_id_idx ON order_items (order_id);
CREATE INDEX order_items_seller_id_idx ON order_items (seller_id);
