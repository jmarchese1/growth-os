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

# Install Chromium with system deps to a shared path
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
RUN npx playwright install --with-deps chromium \
    && chmod -R o+rx /opt/pw-browsers \
    && ls -la /opt/pw-browsers/

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers

# Copy system deps installed by --with-deps from builder
COPY --from=builder /usr/lib/x86_64-linux-gnu /usr/lib/x86_64-linux-gnu
COPY --from=builder /usr/share/fonts /usr/share/fonts
COPY --from=builder /etc/fonts /etc/fonts

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/prospector/node_modules ./services/prospector/node_modules
COPY --from=builder /app/services/prospector/dist ./services/prospector/dist
COPY --from=builder /app/services/prospector/package.json ./services/prospector/
COPY --from=builder /opt/pw-browsers /opt/pw-browsers

EXPOSE 3009
CMD ["node", "services/prospector/dist/index.js"]
