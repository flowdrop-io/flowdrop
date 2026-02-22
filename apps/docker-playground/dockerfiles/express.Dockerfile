# =============================================================
# FlowDrop Example Server (Express) — Docker Build
# =============================================================
# Build context: monorepo root (../../)
#
# Usage:
#   docker build -f apps/docker-playground/dockerfiles/express.Dockerfile -t flowdrop-express .
#   docker run -p 3001:3001 flowdrop-express

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY apps/example-server-express/package.json apps/example-server-express/pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile || pnpm install

COPY apps/example-server-express/src ./src
COPY apps/example-server-express/tsconfig.json ./

RUN pnpm run build

# --- Stage 2: Production ---
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml* ./
RUN pnpm install --prod || pnpm install --prod --no-frozen-lockfile

COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S nodejs && adduser -S flowdrop -u 1001 -G nodejs
RUN chown -R flowdrop:nodejs /app
USER flowdrop

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/flowdrop/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/index.js"]
