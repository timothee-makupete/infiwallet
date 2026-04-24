FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY utils ./utils
COPY validation ./validation
COPY apps ./apps

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/web-user
RUN pnpm --filter @infiwallet/web-user build

FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app/apps/web-user

COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/apps/web-user/.next ./.next
COPY --from=0 /app/apps/web-user/package.json ./package.json
COPY --from=0 /app/apps/web-user/public ./public
COPY --from=0 /app/apps/web-user/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["pnpm", "start"]