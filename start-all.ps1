# start-all.ps1
Write-Host "Starting InfiWallet..." -ForegroundColor Green

# Start Docker containers
Write-Host "Starting Docker containers..." -ForegroundColor Yellow
docker compose up -d postgres redis rabbitmq

# Wait for services to be ready
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Start all services in new windows
Write-Host "Starting backend services..." -ForegroundColor Green

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; `$env:DATABASE_URL='postgresql://infiwallet:infiwallet_dev@localhost:5432/infiwallet?schema=user_management'; `$env:JWT_SECRET='my-super-secret-jwt-key'; `$env:RABBITMQ_URL='amqp://infiwallet:infiwallet_dev@localhost:5672'; `$env:WALLET_SERVICE_URL='http://localhost:3002'; `$env:INTERNAL_API_KEY='dev-internal-key'; `$env:PORT='3001'; pnpm --filter @infiwallet/user-service dev"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; `$env:DATABASE_URL='postgresql://infiwallet:infiwallet_dev@localhost:5432/infiwallet?schema=wallet'; `$env:JWT_SECRET='my-super-secret-jwt-key'; `$env:RABBITMQ_URL='amqp://infiwallet:infiwallet_dev@localhost:5672'; `$env:KYC_SERVICE_URL='http://localhost:3003'; `$env:INTERNAL_API_KEY='dev-internal-key'; `$env:PORT='3002'; pnpm --filter @infiwallet/wallet-service dev"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; `$env:DATABASE_URL='postgresql://infiwallet:infiwallet_dev@localhost:5432/infiwallet?schema=kyc'; `$env:JWT_SECRET='my-super-secret-jwt-key'; `$env:RABBITMQ_URL='amqp://infiwallet:infiwallet_dev@localhost:5672'; `$env:INTERNAL_API_KEY='dev-internal-key'; `$env:PORT='3003'; pnpm --filter @infiwallet/kyc-service dev"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; `$env:USER_SERVICE_URL='http://localhost:3001'; `$env:WALLET_SERVICE_URL='http://localhost:3002'; `$env:KYC_SERVICE_URL='http://localhost:3003'; `$env:REDIS_URL='redis://localhost:6379'; `$env:JWT_SECRET='my-super-secret-jwt-key'; `$env:PORT='3018'; pnpm --filter @infiwallet/api-gateway dev"

Start-Sleep -Seconds 15

# Start frontends
Write-Host "Starting frontend applications..." -ForegroundColor Green

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\web-user'; `$env:NEXT_PUBLIC_API_URL='http://localhost:3018'; pnpm dev"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\web-admin'; `$env:NEXT_PUBLIC_API_URL='http://localhost:3018'; pnpm dev"

Write-Host "All services started!" -ForegroundColor Green
Write-Host "User App: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Admin App: http://localhost:3010" -ForegroundColor Cyan
Write-Host "API Gateway: http://localhost:3018" -ForegroundColor Cyan