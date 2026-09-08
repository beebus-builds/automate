# TeacherFolio — production Dockerfile (Node 22, Next.js standalone)
FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# deps
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure public/uploads and data exist for SQLite fallback
RUN mkdir -p public/uploads data
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy built output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/proxy.ts ./proxy.ts
# Keep data dir writeable for SQLite fallback (volume-mounted in compose)
RUN mkdir -p /app/data /app/public/uploads && chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["npm", "start"]
