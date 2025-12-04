# Оптимизированный multi-stage build для уменьшения размера образа

# ============================================
# Stage 1: Build - сборка приложения
# ============================================
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies only
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install bun
RUN npm install -g bun@latest

# Copy package files
COPY package.json bun.lock* ./

# Install all dependencies (including dev for build)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN bun run build

# Install production dependencies only (after build)
RUN rm -rf node_modules && \
    bun install --frozen-lockfile --production && \
    bun pm cache rm

# ============================================
# Stage 2: Runtime - минимальный production образ
# ============================================
FROM node:20-slim AS runtime

WORKDIR /app

# Install only essential runtime tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install bun (runtime only)
RUN npm install -g bun@latest && \
    npm cache clean --force

# Create non-root user
RUN useradd -m -u 1000 appuser

# Copy package files
COPY package.json bun.lock* ./

# Copy built application and production node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Create minimal wrapper script
RUN echo '#!/bin/sh\nexec bun /app/node_modules/.bin/elizaos "$@"' > /usr/local/bin/elizaos && \
    chmod +x /usr/local/bin/elizaos

# Aggressive cleanup of node_modules
RUN find /app/node_modules -type f \( -name "*.md" -o -name "*.map" -o -name "*.test.*" -o -name "*.spec.*" \) -delete && \
    find /app/node_modules -type d \( -name "__tests__" -o -name "test" -o -name "tests" -o -name ".git" \) -exec rm -rf {} + 2>/dev/null || true

# Final cleanup
RUN apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /root/.npm /root/.cache

# Set ownership
RUN chown -R appuser:appuser /app

USER appuser

ENV NODE_ENV=production

EXPOSE 3000

CMD ["elizaos", "start"]
