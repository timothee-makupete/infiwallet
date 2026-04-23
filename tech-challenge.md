# Fintech Platform Technical Challenge

## Overview

We're looking for talented software engineers to join our team building a modern fintech platform. This challenge tests your ability to design and implement a scalable microservices architecture with proper separation of concerns, event-driven communication, and production-ready code quality.

## Platform Description

You'll be building a simplified version of a fintech platform that includes:
- **User Management**: Registration, authentication, and profile management
- **Wallet System**: Digital wallets with deposit/withdrawal capabilities
- **KYC Service**: Identity verification with tiered limits
- **API Gateway**: Centralized authentication and request routing
- **Web Applications**: User dashboard and admin panel

## Architecture Requirements

### Microservices Structure

```
fintech-platform/
|
|--- services/
|    |--- api-gateway/          # NestJS (main API + auth)
|    |--- user-service/         # NestJS (user management)
|    |--- wallet-service/       # NestJS (wallet + transactions)
|    |--- kyc-service/          # NestJS (verification)
|
|--- apps/
|    |--- web-user/             # Next.js (user dashboard)
|    |--- web-admin/            # Next.js (admin panel)
|
|--- packages/
|    |--- types/                # Shared TypeScript types
|    |--- utils/                # Shared utilities
|    |--- validation/           # Zod schemas
```

### Technology Stack

**Backend Services:**
- **Runtime**: Node.js 20+ LTS
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Message Queue**: RabbitMQ or Redis Streams
- **Validation**: Zod schemas
- **Logging**: Winston

**Frontend Applications:**
- **Framework**: Next.js 16+ with App Router
- **UI Library**: shadcn/ui + Tailwind CSS
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Zod

## Challenge Tasks

### Phase 1: Backend Services (Core)

#### 1.1 API Gateway Service
**Requirements:**
- JWT authentication and authorization
- Rate limiting (100 requests/minute per user)
- Request routing to microservices
- Request/response transformation
- Health check endpoints
- Global error handling

**Endpoints:**
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/health
```

#### 1.2 User Service
**Requirements:**
- User registration and authentication
- Profile management
- Password hashing with bcrypt
- Email verification
- Password reset functionality
- User roles (USER, ADMIN, SUPER_ADMIN)

**Database Schema:**
```sql
CREATE SCHEMA user_management;

CREATE TABLE user_management.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  email_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE user_management.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_management.users(id),
  date_of_birth DATE,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'MW',
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Endpoints:**
```
POST   /api/v1/users/register
POST   /api/v1/users/login
GET    /api/v1/users/:id
PUT    /api/v1/users/:id
POST   /api/v1/users/forgot-password
POST   /api/v1/users/reset-password
GET    /api/v1/users/:id/profile
PUT    /api/v1/users/:id/profile
```

#### 1.3 Wallet Service
**Requirements:**
- Create wallet for new users
- Deposit and withdrawal functionality
- Transaction history
- Balance tracking with atomic operations
- Transaction status tracking
- Event emission for balance changes

**Database Schema:**
```sql
CREATE SCHEMA wallet;

CREATE TABLE wallet.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'MWK',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallet.wallets(id),
  type VARCHAR(30) NOT NULL, -- DEPOSIT, WITHDRAWAL, TRANSFER
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  balance_before DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reference VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Endpoints:**
```
GET    /api/v1/wallets/:userId
POST   /api/v1/wallets/:userId/deposits
POST   /api/v1/wallets/:userId/withdrawals
GET    /api/v1/wallets/:userId/transactions
GET    /api/v1/wallets/:userId/balance
```

#### 1.4 KYC Service
**Requirements:**
- Document upload functionality
- Identity verification workflow
- Tiered KYC levels (Tier 1, Tier 2, Tier 3)
- Transaction limits based on KYC level
- Admin approval workflow
- Document storage metadata

**Database Schema:**
```sql
CREATE SCHEMA kyc;

CREATE TABLE kyc.verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tier INTEGER NOT NULL, -- 1, 2, 3
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  documents JSONB, -- Array of document metadata
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE kyc.tier_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier INTEGER NOT NULL UNIQUE,
  daily_limit DECIMAL(15, 2) NOT NULL,
  monthly_limit DECIMAL(15, 2) NOT NULL,
  single_transaction_limit DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Endpoints:**
```
GET    /api/v1/kyc/:userId
POST   /api/v1/kyc/:userId/submit
PUT    /api/v1/kyc/:id/review
GET    /api/v1/kyc/limits/:tier
```

### Phase 2: Event-Driven Communication

#### 2.1 Event Requirements
Implement event-driven communication between services using RabbitMQ or Redis Streams.

**Critical Events:**
```typescript
// User Events
user.created
user.updated
user.email_verified

// Wallet Events
wallet.created
wallet.balance.credited
wallet.balance.debited
wallet.transaction.created

// KYC Events
kyc.verification.submitted
kyc.verification.approved
kyc.verification.rejected
```

#### 2.2 Event Structure
All events must follow this structure:
```typescript
interface DomainEvent {
  eventId: string;           // UUID
  eventType: string;         // e.g., "wallet.balance.credited"
  timestamp: string;         // ISO 8601
  version: string;           // "1.0"
  aggregateId: string;       // Entity ID
  payload: Record<string, any>;
  metadata: {
    correlationId: string;
    causationId?: string;
    userId?: string;
    service: string;
  };
}
```

#### 2.3 Event Flow Examples

**User Registration Flow:**
```
User Service -> emits user.created -> Wallet Service creates wallet
User Service -> emits user.created -> KYC Service creates Tier 1 verification
```

**Deposit Flow:**
```
Wallet Service -> emits wallet.balance.credited -> Notification Service sends SMS
```

### Phase 3: Frontend Applications

#### 3.1 User Dashboard (Next.js)
**Requirements:**
- User authentication
- Wallet balance display
- Transaction history
- KYC status and document upload
- Profile management
- Real-time updates using WebSockets

**Pages:**
- `/dashboard` - Overview with balance and recent transactions
- `/wallet` - Detailed wallet information
- `/transactions` - Transaction history with filters
- `/profile` - User profile management
- `/kyc` - KYC verification status and document upload

#### 3.2 Admin Panel (Next.js)
**Requirements:**
- Admin authentication
- User management
- KYC verification review
- Transaction monitoring
- System health dashboard

**Pages:**
- `/admin/dashboard` - System overview
- `/admin/users` - User management
- `/admin/kyc` - KYC review queue
- `/admin/transactions` - Transaction monitoring

## Implementation Requirements

### Code Quality Standards

1. **TypeScript Strict Mode**: All TypeScript files must use strict mode
2. **No `any` Types**: Use proper typing throughout
3. **Error Handling**: Comprehensive error handling with proper HTTP status codes
4. **Logging**: Structured logging with Winston
5. **Validation**: Input validation using Zod schemas
6. **Testing**: Unit tests for business logic, integration tests for APIs

### Database Requirements

1. **Migrations**: Use Prisma migrations for schema changes
2. **Seeding**: Provide seed data for development
3. **Indexes**: Proper database indexes for performance
4. **Transactions**: Use database transactions for consistency

### Security Requirements

1. **Authentication**: JWT tokens with proper expiration
2. **Authorization**: Role-based access control
3. **Input Validation**: Validate all inputs
4. **Password Security**: Bcrypt with salt rounds >= 12
5. **Environment Variables**: No hardcoded secrets

### Performance Requirements

1. **API Response Time**: < 200ms (p95)
2. **Database Queries**: Use indexes, avoid N+1 queries
3. **Caching**: Redis for frequently accessed data
4. **Rate Limiting**: Prevent abuse

## Evaluation Criteria

### Technical Excellence (40%)
- Clean, maintainable code
- Proper error handling
- Type safety
- Test coverage
- Performance optimization

### Architecture (30%)
- Microservices separation
- Event-driven design
- Database design
- API design
- Scalability considerations

### Security (20%)
- Authentication/authorization
- Input validation
- Data protection
- Best practices

### Documentation (10%)
- README files
- API documentation
- Code comments
- Deployment instructions

## Bonus Points

- **Dockerization**: Docker and docker-compose setup
- **CI/CD**: GitHub Actions workflow
- **Monitoring**: Health checks and metrics
- **Real-time**: WebSocket implementation
- **Advanced Features**: Two-factor auth, transaction limits, audit logs

## Submission Guidelines

1. **Repository**: Public GitHub repository
2. **Documentation**: Comprehensive README with setup instructions
3. **Demo**: Include screenshots or video of working application
4. **Code Review**: Clean git history with meaningful commits
5. **Deployment**: Deploy application to https://apps.infi-tech.cloud/

### Setup Instructions (include in README)

```bash
# Clone repository
git clone <your-repo-url>
cd fintech-platform

# Install dependencies
pnpm install

# Start databases (docker-compose)
docker-compose up -d postgres redis rabbitmq

# Run database migrations
pnpm run db:migrate

# Seed database
pnpm run db:seed

# Start all services
pnpm run dev
```

### Deployment Requirements

**Deploy the complete application to https://apps.infi-tech.cloud/ using Docker Compose.**

#### Prerequisites
- Docker and Docker Compose installed
- Access to Dokploy at https://apps.infi-tech.cloud/
- GitHub repository with your code

#### Deployment Steps

1. **Create Docker Compose File**
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: fintech_platform
      POSTGRES_USER: fintech_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - fintech-network

  redis:
    image: redis:7-alpine
    networks:
      - fintech-network

  rabbitmq:
    image: rabbitmq:3-management
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    networks:
      - fintech-network

  api-gateway:
    build: ./services/api-gateway
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/fintech_platform?schema=api_gateway
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3018:3018"
    depends_on:
      - postgres
      - redis
      - rabbitmq
    networks:
      - fintech-network

  user-service:
    build: ./services/user-service
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/fintech_platform?schema=user_management
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672
    depends_on:
      - postgres
      - redis
      - rabbitmq
    networks:
      - fintech-network

  wallet-service:
    build: ./services/wallet-service
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/fintech_platform?schema=wallet
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672
    depends_on:
      - postgres
      - redis
      - rabbitmq
    networks:
      - fintech-network

  kyc-service:
    build: ./services/kyc-service
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/fintech_platform?schema=kyc
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672
    depends_on:
      - postgres
      - redis
      - rabbitmq
    networks:
      - fintech-network

  web-user:
    build: ./apps/web-user
    environment:
      NEXT_PUBLIC_API_URL: http://api-gateway:3018
    ports:
      - "3018:3018"
    depends_on:
      - api-gateway
    networks:
      - fintech-network

  web-admin:
    build: ./apps/web-admin
    environment:
      NEXT_PUBLIC_API_URL: http://api-gateway:3018
    ports:
      - "3002:3018"
    depends_on:
      - api-gateway
    networks:
      - fintech-network

volumes:
  postgres_data:

networks:
  fintech-network:
    driver: bridge
```

2. **Create Dockerfile for Each Service**
```dockerfile
# Example: services/api-gateway/Dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3018
CMD ["node", "dist/main.js"]
```

3. **Deploy with Dokploy**

**Step 1: Connect GitHub Repository**
- Go to https://apps.infi-tech.cloud/
- Connect your GitHub repository
- Select the main branch

**Step 2: Configure Application**
- Choose "Docker Compose" deployment
- Upload your `docker-compose.prod.yml`
- Configure environment variables:
  ```bash
  DB_PASSWORD=your_secure_db_password
  DB_USER=fintech_user
  RABBITMQ_USER=your_rabbitmq_user
  RABBITMQ_PASSWORD=your_rabbitmq_password
  JWT_SECRET=your_jwt_secret_key
  ```

**Step 3: Deploy**
- Click "Deploy"
- Monitor deployment logs
- Wait for all services to be healthy

**Step 4: Configure Domain**
- Add custom domain if needed
- Configure SSL certificates (automatic with Dokploy)
- Set up health checks

#### Troubleshooting

If you encounter deployment errors:

1. **Check Dokploy Documentation**: https://dokploy.com/docs
2. **Common Issues**:
   - **Build Failures**: Check Dockerfile syntax and dependencies
   - **Database Connection**: Verify environment variables and network configuration
   - **Port Conflicts**: Ensure ports don't conflict with other applications
   - **Memory Issues**: Adjust resource limits in Dokploy settings

3. **Debugging Commands**:
```bash
# Check container logs
docker-compose logs [service-name]

# Check running containers
docker-compose ps

# Restart services
docker-compose restart [service-name]
```

#### Verification

After deployment, verify:
- API Gateway: https://apps.infi-tech.cloud/api/v1/health
- User Dashboard: https://apps.infi-tech.cloud/
- Admin Panel: https://apps.infi-tech.cloud/admin
- All services are healthy and communicating

**Important**: Ensure your application handles production environment variables and has proper error handling for production scenarios.

## Time Estimate

- **Phase 1**: 8-12 hours (Backend services)
- **Phase 2**: 4-6 hours (Event-driven communication)
- **Phase 3**: 6-8 hours (Frontend applications)
- **Total**: 18-26 hours

## Questions?

If you have any questions about the requirements, feel free to ask. We're looking forward to seeing your solution!

---

**Good luck!** We're excited to see how you approach building a production-ready fintech platform.
