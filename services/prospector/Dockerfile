FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/prospector/ services/prospector/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @embedo/db db:generate
RUN pnpm --filter @embedo/db build
RUN pnpm --filter @embedo/utils build
RUN pnpm --filter @embedo/config build
RUN pnpm --filter @embedo/queue build
RUN pnpm --filter @embedo/prospector build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/prospector/node_modules ./services/prospector/node_modules
COPY --from=builder /app/services/prospector/dist ./services/prospector/dist
COPY --from=builder /app/services/prospector/package.json ./services/prospector/

EXPOSE 3009
CMD ["node", "services/prospector/dist/index.js"]
