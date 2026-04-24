FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY utils ./utils
COPY validation ./validation
COPY services ./services

RUN pnpm install --frozen-lockfile

WORKDIR /app/services/api-gateway
RUN pnpm --filter @infiwallet/api-gateway build

FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app/services/api-gateway

COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/services/api-gateway/dist ./dist
COPY --from=0 /app/services/api-gateway/package.json ./package.json

EXPOSE 3018

CMD ["pnpm", "start"]