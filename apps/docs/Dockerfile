# ============================================================
# FlowDrop Docs — Docker Build
# ============================================================
# Astro/Starlight static site served by nginx.
#
# Build context: apps/docs/ (standalone app, no workspace deps)
#
# Usage:
#   docker build -t flowdrop-docs .
#   docker run -p 80:80 flowdrop-docs

# --- Stage 1: Build ---
# Use Debian-based image — Playwright (needed by rehype-mermaid) requires
# glibc and system libraries not available on Alpine.
FROM node:22-slim AS builder

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Install Playwright's Chromium and its system dependencies for build-time
# Mermaid diagram rendering (rehype-mermaid inline-svg strategy)
RUN npx playwright install --with-deps chromium

# Copy source and build
COPY astro.config.mjs svelte.config.js tsconfig.json ./
COPY src ./src
COPY public ./public

ENV NODE_ENV=production
RUN pnpm run build


# --- Stage 2: Serve ---
FROM nginx:alpine AS server

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
