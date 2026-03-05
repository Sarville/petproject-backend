#!/bin/bash
set -e

APP_DIR="/var/www/petproject-backend"
cd "$APP_DIR"

echo "[$(date)] === Backend deploy started ==="

git pull origin master
docker compose -f docker-compose.prod.yml up -d --build

echo "[$(date)] === Backend deploy complete ==="
docker ps --filter "name=petproject_backend"
