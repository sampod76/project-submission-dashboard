#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  echo -e "\n\033[1;32m**$1**\033[0m"
}

APP_DIR="$HOME/apps/project-submission-dashboard"
OWNER="sampod76"
IMAGE="ghcr.io/$OWNER/project-submission-dashboard:latest"
COMPOSE_FILE="docker-compose.pro.yml"

cd "$APP_DIR"

log "Pulling latest frontend image"
docker pull "$IMAGE"

log "Restarting frontend container"
docker compose -f "$COMPOSE_FILE" up -d --force-recreate

log "Cleaning unused Docker images"
docker image prune -f

log "Cleaning Docker build cache"
docker builder prune -f

log "Frontend deployed successfully"

exit 0
