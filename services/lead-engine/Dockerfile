FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ packages/
COPY services/lead-engine/ services/lead-engine/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @embedo/lead-engine build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/lead-engine/dist ./services/lead-engine/dist
COPY --from=builder /app/services/lead-engine/package.json ./services/lead-engine/

EXPOSE 3004
CMD ["node", "services/lead-engine/dist/index.js"]
