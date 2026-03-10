FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ packages/
COPY services/social-media/ services/social-media/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @embedo/social-media build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/social-media/dist ./services/social-media/dist
COPY --from=builder /app/services/social-media/package.json ./services/social-media/

EXPOSE 3006
CMD ["node", "services/social-media/dist/index.js"]
