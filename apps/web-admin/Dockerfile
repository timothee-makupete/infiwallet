FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps ./apps

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/web-admin
RUN pnpm --filter @infiwallet/web-admin build

FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app/apps/web-admin

COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/apps/web-admin/.next ./.next
COPY --from=0 /app/apps/web-admin/package.json ./package.json
COPY --from=0 /app/apps/web-admin/public ./public
COPY --from=0 /app/apps/web-admin/next.config.ts ./next.config.ts

EXPOSE 3010

CMD ["pnpm", "start"]