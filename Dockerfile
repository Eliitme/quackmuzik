# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:18-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies with BuildKit cache mount
# This allows GitHub Actions to cache node_modules between builds
RUN --mount=type=cache,target=/root/.npm \
    npm config set cache /root/.npm --global && \
    npm ci --only=production --no-audit

# ============================================
# Stage 2: Build
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN --mount=type=cache,target=/root/.npm \
    npm config set cache /root/.npm --global && \
    npm ci --no-audit

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# ============================================
# Stage 3: Production
# ============================================
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built files from builder stage (includes locales from build step)
COPY --from=builder /app/dist ./dist

# Ensure locales are available (backup copy from source if needed)
# Build script should have copied them to dist/locales, but this ensures they exist
COPY --from=builder /app/src/locales ./src/locales

# Copy package files for npm start command
COPY package*.json ./

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Note: No healthcheck needed as this is a Discord bot, not an HTTP server
# Kubernetes liveness/readiness probes are configured in Helm chart

# Start the bot
CMD ["npm", "start"]

