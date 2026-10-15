# ================================================================
# Backend Dockerfile — Shoe Repair Job Tracking System
# Lightweight Node.js 20 production container
# ================================================================

FROM node:20-bookworm-slim

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests for efficient layer caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source code
COPY src/ ./src/

# Prepare persistent uploads directory with proper ownership
RUN mkdir -p /app/uploads && chown -R node:node /app

# Run as unprivileged user for security
USER node

# Production environment defaults
ENV NODE_ENV=production \
    PORT=3001 \
    UPLOAD_DIR=/app/uploads

EXPOSE 3001

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost:3001/health || exit 1

CMD ["node", "src/app.js"]
