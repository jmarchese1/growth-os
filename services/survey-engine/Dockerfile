FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ packages/
COPY services/survey-engine/ services/survey-engine/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @embedo/survey-engine build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/survey-engine/dist ./services/survey-engine/dist
COPY --from=builder /app/services/survey-engine/package.json ./services/survey-engine/

EXPOSE 3005
CMD ["node", "services/survey-engine/dist/index.js"]
