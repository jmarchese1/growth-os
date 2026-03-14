FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json turbo.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/ packages/
COPY services/website-gen/ services/website-gen/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @embedo/website-gen build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/website-gen/dist ./services/website-gen/dist
COPY --from=builder /app/services/website-gen/package.json ./services/website-gen/

EXPOSE 3007
CMD ["node", "services/website-gen/dist/index.js"]
