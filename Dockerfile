# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build Next.js in standalone mode
RUN npm run build

# ---- Stage 2: Runner ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Don't run as root for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set correct ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
