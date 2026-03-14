FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json turbo.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/ packages/
COPY services/website-gen/ services/website-gen/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "@embedo/types" build
RUN pnpm --filter "@embedo/utils" build
RUN pnpm --filter "@embedo/config" build
RUN pnpm --filter "@embedo/db" build
RUN pnpm --filter "@embedo/queue" build
RUN pnpm --filter @embedo/website-gen build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/services/website-gen/dist ./services/website-gen/dist
COPY --from=builder /app/services/website-gen/package.json ./services/website-gen/
COPY --from=builder /app/services/website-gen/node_modules ./services/website-gen/node_modules

EXPOSE 3007
CMD ["node", "services/website-gen/dist/index.js"]
