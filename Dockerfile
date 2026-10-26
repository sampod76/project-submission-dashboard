
FROM node:22.18.0-slim AS deps
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/pnpm \
    PNPM_STORE_DIR=/pnpm-store
WORKDIR /app


RUN corepack enable && corepack prepare pnpm@10.19.0 --activate \
    && mkdir -p "$PNPM_HOME" "$PNPM_STORE_DIR"



COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* .npmrc* ./


RUN pnpm fetch



FROM node:22.18.0-slim AS builder
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/pnpm \
    PNPM_STORE_DIR=/pnpm-store
WORKDIR /app


RUN corepack enable && corepack prepare pnpm@10.19.0 --activate \
    && mkdir -p "$PNPM_HOME" "$PNPM_STORE_DIR"

COPY --from=deps /pnpm-store /pnpm-store
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* .npmrc* ./


RUN pnpm install --frozen-lockfile --prefer-offline

COPY . .

ARG NEXT_PUBLIC_BASE_URL

ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}

RUN test -n "$NEXT_PUBLIC_BASE_URL" || (echo "NEXT_PUBLIC_BASE_URL missing during build" >&2 && exit 1)
RUN pnpm build

FROM node:22.18.0-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3005 \
    HOSTNAME=0.0.0.0

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && npm i -g pm2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/.next/standalone ./ 
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY ecosystem.config.js ./ecosystem.config.js

# Next Image writes resized variants here while the server runs as node.
RUN mkdir -p .next/cache/images && chown -R node:node .next/cache
# Fail the image build if standalone tracing omitted the native optimizer.
RUN node -e "require('sharp')"

COPY --chown=node:node docker-entry.sh ./docker-entry.sh
RUN chmod +x ./docker-entry.sh

USER node

EXPOSE 3005
ENTRYPOINT ["/app/docker-entry.sh"]
