FROM node:20-slim AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/prospector/ services/prospector/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @embedo/db db:generate
RUN npx turbo run build --filter=@embedo/prospector

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install Playwright dependencies (Chromium system libs)
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 \
    libasound2 libatspi2.0-0 libwayland-client0 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Install Playwright browsers
RUN npm install -g pnpm && npx playwright install chromium --with-deps 2>/dev/null || true

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/prospector/node_modules ./services/prospector/node_modules
COPY --from=builder /app/services/prospector/dist ./services/prospector/dist
COPY --from=builder /app/services/prospector/package.json ./services/prospector/

EXPOSE 3009
CMD ["node", "services/prospector/dist/index.js"]
