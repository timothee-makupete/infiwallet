FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY services ./services

RUN pnpm install --frozen-lockfile

WORKDIR /app/services/user-service
RUN pnpm --filter @infiwallet/user-service build

FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app/services/user-service

COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/services/user-service/dist ./dist
COPY --from=0 /app/services/user-service/package.json ./package.json

EXPOSE 3001

CMD ["pnpm", "start"]