#!/usr/bin/env sh

set -e

echo "Starting PM2..."
exec pm2-runtime start ecosystem.config.js --env production
