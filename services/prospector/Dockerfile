FROM node:20-slim AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app

# Tell Playwright to install browsers INSIDE the app directory (not /root/.cache)
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers

# System deps needed for Chromium download verification
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

# pnpm install triggers playwright-chromium to download Chromium to /app/.playwright-browsers
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @embedo/db db:generate
RUN npx turbo run build --filter=@embedo/prospector

# Verify the browser was downloaded
RUN ls -la /app/.playwright-browsers/ || echo "WARNING: No browsers found"

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# MUST match the builder path so Playwright finds the browser at runtime
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers

# System deps for Chromium runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 \
    libasound2 libatspi2.0-0 libwayland-client0 \
    fonts-liberation fonts-noto-color-emoji ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/prospector/node_modules ./services/prospector/node_modules
COPY --from=builder /app/services/prospector/dist ./services/prospector/dist
COPY --from=builder /app/services/prospector/package.json ./services/prospector/

# Copy the browser binaries from builder (stored in /app/.playwright-browsers)
COPY --from=builder /app/.playwright-browsers /app/.playwright-browsers

EXPOSE 3009
CMD ["node", "services/prospector/dist/index.js"]
