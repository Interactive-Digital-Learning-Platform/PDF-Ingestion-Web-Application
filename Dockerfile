# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Multi-stage production Dockerfile for the PDF Ingestion web app (Next.js 16,
# App Router). Produces a minimal image that runs the standalone server
# (`output: "standalone"` in next.config.ts) as a non-root user.
#
# Build:
#   docker build \
#     --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx \
#     --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/pdf \
#     --build-arg NEXT_PUBLIC_WS_BASE_URL=wss://api.example.com/api/pdf \
#     -t pdf-ingestion-web .
#
# Run:
#   docker run --rm -p 3000:3000 \
#     -e CLERK_SECRET_KEY=sk_live_xxx \
#     pdf-ingestion-web
# ---------------------------------------------------------------------------

ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------------------------
# Stage 1 — deps: install full dependencies from the lockfile
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
# libc6-compat: some Next.js/SWC native binaries expect glibc symbols on Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# Stage 2 — builder: compile the production build
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they
# must be present now (not just at runtime). Defaults mirror .env for local
# builds; override them with --build-arg for a real deployment.
ARG NEXT_PUBLIC_API_BASE_URL="http://localhost:8080/api/pdf"
ARG NEXT_PUBLIC_WS_BASE_URL="ws://localhost:8080/api/pdf"
ARG NEXT_PUBLIC_MAX_FILE_SIZE_MB="20"
# Clerk's publishable key is required while prerendering <ClerkProvider>.
# The default below is the shared Clerk test key; pass a real key for production.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_Z29yZ2VvdXMtYmF0LTczLmNsZXJrLmFjY291bnRzLmRldiQ"

ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_WS_BASE_URL=${NEXT_PUBLIC_WS_BASE_URL} \
    NEXT_PUBLIC_MAX_FILE_SIZE_MB=${NEXT_PUBLIC_MAX_FILE_SIZE_MB} \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3 — runner: lean runtime image
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Run as a dedicated non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Static assets served directly by the standalone server
COPY --from=builder /app/public ./public

# Standalone output already contains server.js + the minimal node_modules subset
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# server.js honours PORT / HOSTNAME from the environment
CMD ["node", "server.js"]
