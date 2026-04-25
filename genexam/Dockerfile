# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: generate Prisma client + build Next.js ──────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (uses prisma.config.ts automatically)
RUN npx prisma generate

# Dummy env vars so `next build` can complete (not used at runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/genexam
ENV NEXTAUTH_SECRET=build-time-placeholder-secret-32ch
ENV NEXTAUTH_URL=http://localhost:3000
ENV ENCRYPTION_KEY=build-time-placeholder-32chars!!

RUN npm run build

# Copy runtime dependencies that Next.js standalone tracing misses.
#
# Rule: when the destination directory already exists (because Next.js tracing
# partially populated it), `cp -r src dest` nests src *inside* dest instead of
# merging.  Use explicit file/subdir copies to stay in control.
RUN cp -r node_modules/.prisma .next/standalone/node_modules/.prisma && \
    cp -r node_modules/@prisma/adapter-pg .next/standalone/node_modules/@prisma/adapter-pg || true && \
    cp -r node_modules/pg .next/standalone/node_modules/pg || true && \
    cp -r node_modules/pg-protocol .next/standalone/node_modules/pg-protocol || true && \
    cp -r node_modules/mammoth .next/standalone/node_modules/mammoth || true && \
    # resend — used for the "email results" feature.
    # Next.js tracing sometimes misses it because the import is inside a
    # dynamically-resolved API route; defensive copy mirrors mammoth / pg.
    cp -r node_modules/resend .next/standalone/node_modules/resend || true && \
    cp -r node_modules/undici .next/standalone/node_modules/undici || true && \
    \
    # pdf-parse: Next.js traces index.cjs but not the worker (dynamically loaded).
    # The CJS bundle ships pdf.worker.mjs alongside index.cjs; copy it to the
    # exact path that require.resolve("pdf-parse") resolves to at runtime.
    cp node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs \
       .next/standalone/node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs || true

# ── Stage 3: lean production image ───────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
