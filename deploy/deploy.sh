#!/usr/bin/env bash
set -euo pipefail

TAG="${1:?Usage : deploy.sh <tag>, par exemple deploy.sh sha-a1b2c3d}"
cd "$(dirname "$0")"

echo "==> Déploiement de la version $TAG"
echo "IMAGE_TAG=$TAG" > .env

docker compose pull
docker compose up -d --remove-orphans

# Prise en compte d'une éventuelle modification du Caddyfile
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile

# Suppression des anciennes images pour ne pas remplir le disque de 30 Go
docker image prune -f

docker compose ps
echo "==> Version $TAG déployée"