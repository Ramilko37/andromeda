# Multi-stage build для уменьшения размера образа

# ============================================
# Stage 1: Build stage - сборка приложения
# ============================================
FROM node:20-slim AS builder

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    make \
    g++ \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install bun
RUN npm install -g bun@latest

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN bun run build

# ============================================
# Stage 2: Runtime stage - минимальный образ
# ============================================
FROM node:20-slim AS runtime

# Install only runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install bun (lightweight)
RUN npm install -g bun@latest

# Create app user
RUN useradd -m -u 1000 appuser

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install only production dependencies
RUN bun install --frozen-lockfile --production && \
    bun pm cache rm && \
    rm -rf /root/.bun/install/cache && \
    rm -rf /tmp/*

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin

# Create wrapper script for elizaos
RUN echo '#!/bin/sh\nexec /app/node_modules/.bin/elizaos "$@"' > /usr/local/bin/elizaos && \
    chmod +x /usr/local/bin/elizaos

# Remove unnecessary files
RUN rm -rf /app/src \
    /app/__tests__ \
    /app/*.test.ts \
    /app/*.spec.ts \
    /app/cypress \
    /app/docs \
    /app/*.md \
    /app/Dockerfile* \
    /app/docker-compose*.yml \
    /app/.git \
    /app/.github \
    /app/scripts \
    /app/vite.config.ts \
    /app/tailwind.config.js \
    /app/postcss.config.js \
    /app/cypress.config.ts \
    /app/build.ts \
    /app/tsconfig*.json || true

# Change ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start application
CMD ["elizaos", "start"]
