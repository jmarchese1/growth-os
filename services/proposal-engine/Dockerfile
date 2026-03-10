FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ packages/
COPY services/proposal-engine/ services/proposal-engine/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @embedo/proposal-engine build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/proposal-engine/dist ./services/proposal-engine/dist
COPY --from=builder /app/services/proposal-engine/package.json ./services/proposal-engine/

EXPOSE 3008
CMD ["node", "services/proposal-engine/dist/index.js"]
