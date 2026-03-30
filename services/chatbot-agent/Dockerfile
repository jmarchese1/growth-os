FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/chatbot-agent/ services/chatbot-agent/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @embedo/db build
RUN pnpm --filter @embedo/utils build
RUN pnpm --filter @embedo/types build
RUN pnpm --filter @embedo/queue build
RUN pnpm --filter @embedo/config build
RUN pnpm --filter @embedo/chatbot-agent build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/chatbot-agent/dist ./services/chatbot-agent/dist
COPY --from=builder /app/services/chatbot-agent/package.json ./services/chatbot-agent/

EXPOSE 3003
CMD ["node", "services/chatbot-agent/dist/index.js"]
