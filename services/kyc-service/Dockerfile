FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY services ./services

RUN pnpm install --frozen-lockfile

WORKDIR /app/services/kyc-service
RUN pnpm --filter @infiwallet/kyc-service build

FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app/services/kyc-service

COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/services/kyc-service/dist ./dist
COPY --from=0 /app/services/kyc-service/package.json ./package.json

EXPOSE 3003

CMD ["pnpm", "start"]