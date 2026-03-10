FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ packages/
COPY services/voice-agent/ services/voice-agent/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @embedo/voice-agent build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/voice-agent/dist ./services/voice-agent/dist
COPY --from=builder /app/services/voice-agent/package.json ./services/voice-agent/

EXPOSE 3002
CMD ["node", "services/voice-agent/dist/index.js"]
