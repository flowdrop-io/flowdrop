# ============================================================
# FlowDrop API Docs — Docker Build
# ============================================================
# Redocly-generated static site served by nginx.
#
# Build context: repo root (requires libs/flowdrop/api/)
#
# Usage (from repo root):
#   docker build -f apps/api-docs/Dockerfile -t flowdrop-api-docs .
#   docker run -p 80:80 flowdrop-api-docs

# --- Stage 1: Build ---
FROM node:22-alpine AS builder

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Install dependencies (apps/api-docs only has devDependencies — no lockfile workspace magic)
COPY apps/api-docs/package.json apps/api-docs/pnpm-lock.yaml ./apps/api-docs/
RUN cd apps/api-docs && pnpm install --frozen-lockfile

# Copy source files needed by the build script
COPY apps/api-docs/scripts ./apps/api-docs/scripts
COPY apps/api-docs/redocly.yaml ./apps/api-docs/redocly.yaml
COPY libs/flowdrop/api ./libs/flowdrop/api

ENV NODE_ENV=production
RUN cd apps/api-docs && pnpm run build


# --- Stage 2: Serve ---
FROM nginx:alpine AS server

# Copy built static files
COPY --from=builder /app/apps/api-docs/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/api-docs/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
