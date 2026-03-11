FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json turbo.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/ packages/
COPY services/crm-core/ services/crm-core/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @embedo/db db:generate
RUN pnpm --filter @embedo/crm-core build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/crm-core/dist ./services/crm-core/dist
COPY --from=builder /app/services/crm-core/package.json ./services/crm-core/

EXPOSE 3001
CMD ["node", "services/crm-core/dist/index.js"]
