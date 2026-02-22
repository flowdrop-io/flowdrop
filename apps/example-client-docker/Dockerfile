# FlowDrop Docker Example
# Builds a production-ready FlowDrop UI from the published npm package

# Stage 1: Build the application
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source and config files
COPY svelte.config.js vite.config.ts tsconfig.json ./
COPY src ./src
COPY static ./static

# Build the application with adapter-node
ENV NODE_ENV=production
RUN pnpm run build

# Stage 2: Production image
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Install production dependencies only
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod || pnpm install --prod --no-frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
  adduser -S flowdrop -u 1001

# Change ownership of the app directory
RUN chown -R flowdrop:nodejs /app

# Switch to non-root user
USER flowdrop

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/config', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "build"]
