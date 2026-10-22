# La Boutique — e-commerce Next.js

Petite marketplace full-stack : catalogue public, comptes **client**, **vendeur** et **admin**, panier, commandes et administration.

**Stack** : Next.js 16 (App Router, Server Components, Server Actions, Cache Components), TypeScript, Tailwind CSS 4 + daisyUI 5, PostgreSQL 18 (driver `pg`, SQL écrit à la main), Zod, Vitest.

## Démarrage

Prérequis : Node.js ≥ 20.12, Docker (ou un serveur PostgreSQL existant).

```bash
npm install
cp .env.example .env.local      # puis remplacez les mots de passe / secrets
#   openssl rand -hex 32          → SESSION_SECRET
npm run db:up                   # démarre PostgreSQL dans Docker (port 5433)
npm run db:setup                # migrations + données de démonstration
npm run dev                     # http://localhost:3000
```

Avec un PostgreSQL déjà installé : créez une base et un utilisateur, renseignez `DATABASE_URL` dans `.env.local`, puis lancez directement `npm run db:setup`.

| Commande | Rôle |
| --- | --- |
| `npm run dev` / `build` / `start` | Développement, build et serveur de production |
| `npm run db:up` / `db:down` | Démarre / arrête le conteneur PostgreSQL |
| `npm run db:migrate` | Applique les migrations de `db/migrations` non encore appliquées |
| `npm run db:seed` | Ajoute les données de démo (idempotent, n'écrase rien) |
| `npm test` | Tests unitaires + intégration (base `TEST_DATABASE_URL`, nom en `_test`) |
| `npm run check` | Lint, typage, tests et build |

Créer la base de test (une fois) : `docker exec e-commerce-db createdb -U ecommerce ecommerce_test`. Sans `TEST_DATABASE_URL`, les tests d'intégration sont ignorés.

## Comptes de démonstration

| Rôle | E-mail | Mot de passe |
| --- | --- | --- |
| Admin | `admin@boutique.test` | `Admin123!` |
| Vendeur | `vendeur@boutique.test` | `Vendeur123!` |
| Vendeur | `vendeuse@boutique.test` | `Vendeur123!` |
| Client | `client@boutique.test` | `Client123!` |

## Interroger la base de données

Le projet n'utilise pas d'ORM : le schéma est dans `db/migrations/*.sql` et on interroge la base en SQL avec `psql`.

**Se connecter**

```bash
# Via le conteneur Docker (aucune installation locale nécessaire)
docker exec -it e-commerce-db psql -U ecommerce -d ecommerce

# Ou avec le psql de la machine, en réutilisant DATABASE_URL de .env.local
set -a; source .env.local; set +a
psql "$DATABASE_URL"

# Base de test (tests d'intégration)
docker exec -it e-commerce-db psql -U ecommerce -d ecommerce_test
```

Pour une requête ponctuelle sans ouvrir de session : `docker exec e-commerce-db psql -U ecommerce -d ecommerce -c "SELECT …;"`.

**Commandes psql utiles**

| Commande | Rôle |
| --- | --- |
| `\dt` | Lister les tables |
| `\d products` | Colonnes, index et contraintes d'une table |
| `\dT+` | Types énumérés (`user_role`, `order_status`) |
| `\x auto` | Affichage vertical pour les lignes larges |
| `\q` | Quitter |

**Tables** : `users`, `sessions`, `products`, `product_images`, `cart_items`, `orders`, `order_items`, `schema_migrations` (migrations appliquées). Les montants sont en **centimes** (`price_cents`, `total_cents`…).

**Exemples de requêtes**

```sql
-- Comptes et rôles
SELECT id, email, name, role, is_active FROM users ORDER BY id;

-- Produits avec leur vendeur, prix en euros
SELECT p.id, p.name, u.name AS vendeur, (p.price_cents / 100.0)::numeric(10,2) AS prix, p.stock, p.is_active
FROM products p JOIN users u ON u.id = p.seller_id
ORDER BY p.id;

-- Dernières commandes et leur client
SELECT o.id, u.email, o.status, (o.total_cents / 100.0)::numeric(10,2) AS total, o.created_at
FROM orders o JOIN users u ON u.id = o.user_id
ORDER BY o.id DESC LIMIT 20;

-- Détail d'une commande (nom et prix figés au moment de l'achat)
SELECT product_name, quantity, (unit_price_cents / 100.0)::numeric(10,2) AS prix_unitaire
FROM order_items WHERE order_id = 1;

-- Contenu des paniers
SELECT u.email, p.name, c.quantity
FROM cart_items c JOIN users u ON u.id = c.user_id JOIN products p ON p.id = c.product_id;

-- Sessions actives
SELECT s.user_id, u.email, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.expires_at > now();
```

> Évitez de modifier les données à la main (stock, statut de commande…) : passez par l'application, qui vérifie les règles métier et fait les mises à jour dans une transaction. Les mots de passe ne sont pas lisibles en base : seul leur hash scrypt est stocké.

## Fonctionnalités

- **Visiteurs** : catalogue avec recherche et filtre par catégorie, fiche produit.
- **Clients** : inscription/connexion, panier (ajout, quantité plafonnée au stock, suppression), commande avec adresse de livraison, historique, annulation d'une commande « en attente » (remise en stock).
- **Vendeurs** : inscription, création/modification/masquage/suppression de leurs produits, commandes contenant leurs articles (seules leurs lignes sont visibles).
- **Admin** : statistiques, gestion des utilisateurs (rôle, activation — un compte désactivé est déconnecté et ses produits sortent du catalogue), gestion de tous les produits, suivi des commandes avec transitions de statut contrôlées.

## Sécurité

- Mots de passe hachés avec **scrypt** (sel aléatoire, comparaison à temps constant) ; hash factice si l'e-mail est inconnu.
- Sessions en base : cookie `httpOnly`, `SameSite=Lax`, `Secure` en production ; seul un HMAC du jeton est stocké.
- **Le rôle est relu en base à chaque requête** (`getCurrentUser`) ; chaque page protégée et chaque Server Action appelle `requireRole()`. Le `proxy.ts` ne fait qu'une redirection rapide sans cookie.
- Contrôle de propriété côté serveur (un vendeur ne peut modifier que ses produits, un client ne voit que ses commandes) ; l'inscription n'accepte que `client` ou `vendeur`.
- Validation Zod de toutes les entrées, requêtes SQL paramétrées, commande passée dans une transaction avec verrouillage des lignes produits (pas de survente).
- Limitation des tentatives de connexion (5 / 15 min par IP + e-mail), redirections post-connexion limitées aux chemins internes. Aucun secret côté client (pas de variable `NEXT_PUBLIC_*`).

## Architecture

```
db/migrations/        Schéma SQL versionné
scripts/              Migration et seed (tsx)
src/proxy.ts          Redirection optimiste des pages protégées
src/lib/db.ts         Pool PostgreSQL, helpers de requête et transaction
src/lib/auth/         Hachage, sessions, gardes de rôle
src/lib/data/         Couche d'accès aux données (server-only)
src/lib/validation.ts Schémas Zod
src/app/actions/      Server Actions (auth, panier/commande, produits, admin)
src/app/              Pages (catalogue, produits, panier, commandes, vendeur, admin)
src/components/       Composants UI (formulaires, confirmation modale, navbar…)
tests/                Tests unitaires et d'intégration PostgreSQL
```

## Limites connues

- Pas de paiement en ligne : les commandes sont en « paiement à la livraison ».
- Images produits par URL https (pas d'upload de fichiers).
- Pas de réinitialisation de mot de passe ni de vérification d'e-mail.
- Le vendeur consulte ses commandes mais ne change pas leur statut (réservé à l'admin).
- Limiteur de tentatives en mémoire : à remplacer par un stockage partagé en déploiement multi-instance.
- Pas de pagination (catalogue limité à 100 produits par recherche).
