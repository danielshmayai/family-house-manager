FROM node:20-alpine AS base
RUN apk add --no-cache openssl

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci --legacy-peer-deps

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Create data directory for SQLite
RUN mkdir -p /data && chown nextjs:nodejs /data

# Only the scripts actually needed at runtime
COPY --from=builder /app/scripts/migrate-data.js ./scripts/migrate-data.js
COPY --from=builder /app/scripts/check_http.js ./scripts/check_http.js
COPY --from=builder /app/data-migrations ./data-migrations

# Script to run migrations then start
COPY --from=builder /app/start.sh ./start.sh
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/data/family.db"

CMD ["./start.sh"]
