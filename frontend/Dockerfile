# ================================================================
# Frontend Dockerfile — Shoe Repair Job Tracking System
# Multi-stage build: Vite production build -> Nginx Alpine server
# ================================================================

# --- Stage 1: Build SPA bundle ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Stage 2: Lightweight Nginx runtime ---
FROM nginx:alpine

# Copy compiled frontend assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
