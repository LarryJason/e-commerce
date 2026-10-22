Crée dans le dossier actuel une petite application e-commerce full-stack avec Next.js.

Avant de commencer, examine le contenu du dossier et l’environnement existant. Réutilise les outils et conventions déjà en place lorsqu’ils sont adaptés. Si le dossier est vide, initialise un projet Next.js avec TypeScript et App Router.

## Fonctionnalités

L’application doit permettre :

- aux visiteurs de consulter le catalogue et la fiche détaillée des produits ;
- aux clients de créer un compte, se connecter, gérer leur panier et passer une commande ;
- aux vendeurs de créer un compte, ajouter et modifier leurs produits, et consulter les commandes contenant leurs articles ;
- à l’administrateur de gérer les utilisateurs, les produits et les commandes.

Mets en place une authentification sécurisée avec des rôles distincts : `client`, `vendeur` et `admin`. Protège les pages et les actions selon le rôle de l’utilisateur. Ne fais jamais confiance au rôle envoyé par le navigateur : vérifie-le côté serveur.

## Base de données

SQL est installé sur cette machine. Vérifie quel moteur SQL et quels outils sont disponibles avant de choisir la configuration. Crée la base de données et les tables nécessaires, puis ajoute des données de démonstration si cela facilite les tests.

Ne supprime ni ne modifie de données existantes sans confirmation. Place les paramètres de connexion dans un fichier `.env.local` et fournis un `.env.example` sans identifiants réels. Si une information ou une autorisation manque pour créer la base, indique clairement ce qui est nécessaire et poursuis le reste du projet.

## Interface et technologie

- Utilise Next.js, TypeScript et daisyUI.
- Crée une interface responsive, accessible et en français.
- Prévois des états de chargement, des erreurs compréhensibles et des confirmations pour les actions importantes.
- Garde une architecture claire et maintenable, avec validation des données côté serveur.
- Ne stocke jamais les mots de passe en clair ; utilise un mécanisme de hachage adapté.
- N’expose aucun secret dans le code client.

## Livraison

Implémente réellement les fonctionnalités principales, pas seulement des maquettes ou des boutons sans action. Ajoute les migrations ou le schéma de base de données, ainsi que des tests utiles si le projet le permet.

À la fin :
1. vérifie que l’application démarre et que les vérifications disponibles passent ;
2. indique les fichiers et fonctionnalités créés ;
3. donne les commandes pour installer les dépendances, configurer l’environnement, initialiser la base et lancer l’application ;
4. signale les comptes de démonstration et leurs identifiants, s’il y en a ;
5. mentionne clairement les éventuelles fonctionnalités incomplètes.

