# FlowDrop Production Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (--ignore-scripts prevents platform-specific binary issues during QEMU emulation)
RUN npm ci --ignore-scripts && \
  npm rebuild esbuild

# Copy configuration files
COPY tsconfig.json tsconfig.node.json svelte.config.js vite.config.ts ./

# Copy source code
COPY src ./src
COPY static ./static
COPY index.html ./

# Build the application (use NODE_ENV=production to ensure adapter-node is used)
ENV NODE_ENV=production
ENV DOCKER_BUILD=true
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Install production dependencies only
# Using --ignore-scripts prevents platform-specific binary installation issues during QEMU cross-platform builds
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

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

