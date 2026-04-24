# InfiWallet

Monorepo for the InfiWallet fintech platform: NestJS microservices (user, wallet, KYC), API gateway, RabbitMQ events, and Next.js user and admin web apps.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL, Redis, RabbitMQ)

## Quick start

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set `JWT_SECRET`, `INTERNAL_API_KEY`, and URLs if needed.

2. Start infrastructure:

   ```bash
   docker compose up -d postgres redis rabbitmq
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Generate Prisma clients and apply schemas (development):

   ```bash
   pnpm run db:generate
   pnpm run db:push
   ```

5. Seed tier limits (KYC) and admin user:

   ```bash
   pnpm run db:seed
   ```

6. Run all backend services and apps in separate terminals (or use a process manager):

   ```bash
   # Terminal 1 — user service
   set DATABASE_URL=%USER_DATABASE_URL% && set JWT_SECRET=your-secret && set RABBITMQ_URL=amqp://infiwallet:infiwallet_dev@localhost:5672 && set PORT=3001 && pnpm --filter @infiwallet/user-service dev
   ```

   On Windows PowerShell, use `$env:DATABASE_URL="..."` instead of `set`.

   Easier: use the provided script after exporting variables from `.env`:

   - User: `3001`, Wallet: `3002`, KYC: `3003`, Gateway: `3018`
   - Wallet needs `KYC_SERVICE_URL=http://localhost:3003` and `INTERNAL_API_KEY` matching `.env`

   Start gateway last with `USER_SERVICE_URL`, `WALLET_SERVICE_URL`, `KYC_SERVICE_URL`, `REDIS_URL`.

7. Web apps:

   ```bash
   cd apps/web-user && pnpm dev
   cd apps/web-admin && pnpm dev
   ```

   Set `NEXT_PUBLIC_API_URL=http://localhost:3018` for both apps.

## Deployment

1. Ensure Docker is running.

2. Build the project:

   ```bash
   pnpm install
   pnpm run build
   ```

3. Set environment variables in `.env` (see docker-compose.yml for required vars).

4. Deploy with Docker Compose:

   ```bash
   docker-compose up --build
   ```

   This will start all services, databases, and web apps.

   - API Gateway: http://localhost:3018
   - Web User: http://localhost:3018
   - Web Admin: http://localhost:3002

## Default admin (after seed)

- Email: `admin@infiwallet.local` (or `SEED_ADMIN_EMAIL`)
- Password: `Admin123456!` (or `SEED_ADMIN_PASSWORD`)

## API entrypoint

- Gateway: `http://localhost:3018/api/v1`
- Health: `GET /api/v1/health`
- Auth: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`

Downstream routes are proxied: `/users`, `/wallets`, `/kyc`.

## Architecture

- **api-gateway**: Rate limiting (100/min per token or IP), JWT logout blacklist (Redis), proxies to other services.
- **user-service**: Users, profiles, JWT issuance, emits `user.*` events.
- **wallet-service**: Wallets and transactions; consumes `user.created`; calls KYC for tier limits.
- **kyc-service**: Verifications, tier limits, consumes `user.created`; internal tier API for wallet.

## Scripts (root)

| Script        | Description                                      |
| ------------- | ------------------------------------------------ |
| `pnpm build`  | Build all packages and services                  |
| `pnpm db:push`| `prisma db push` for user, wallet, kyc schemas   |
| `pnpm db:seed`| Seed admin user + KYC tier limits                |

## License

Private / challenge project.
