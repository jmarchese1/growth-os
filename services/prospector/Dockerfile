FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json turbo.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/ packages/
COPY services/prospector/ services/prospector/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @embedo/db db:generate
RUN pnpm turbo run build --filter=@embedo/prospector

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
