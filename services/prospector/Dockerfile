FROM node:20-slim AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app

# Install Chromium system dependencies in builder too (playwright-chromium downloads during install)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 \
    libasound2 libatspi2.0-0 libwayland-client0 \
    fonts-liberation ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/prospector/ services/prospector/

# playwright-chromium downloads Chromium during pnpm install
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @embedo/db db:generate
RUN npx turbo run build --filter=@embedo/prospector

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# System deps for Chromium runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 \
    libasound2 libatspi2.0-0 libwayland-client0 \
    fonts-liberation fonts-noto-color-emoji ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy everything including the playwright-chromium browser binary from node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/prospector/node_modules ./services/prospector/node_modules
COPY --from=builder /app/services/prospector/dist ./services/prospector/dist
COPY --from=builder /app/services/prospector/package.json ./services/prospector/

# Also copy the playwright browser cache from builder (in case it installed there)
COPY --from=builder /root/.cache/ms-playwright /root/.cache/ms-playwright

EXPOSE 3009
CMD ["node", "services/prospector/dist/index.js"]
