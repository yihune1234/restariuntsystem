# Multi-stage production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install production and build dependencies
RUN npm ci

# Copy application source code
COPY . .

# Production image
FROM node:20-alpine

WORKDIR /usr/src/app

# Set node environment
ENV NODE_ENV=production

# Install curl for docker healthcheck
RUN apk --no-cache add curl

# Copy installed modules and source from builder
COPY --from=builder /usr/src/app ./

# Create non-root user for security
USER node

# Expose default port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Start production server
CMD ["node", "src/server.js"]
