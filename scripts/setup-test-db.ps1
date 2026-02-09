# Setup Local Test Database
# Creates PostgreSQL database and applies Prisma schema

Write-Host "🔵 Setting up LOCAL test database..." -ForegroundColor Blue

# Check if PostgreSQL is installed
$pgVersion = psql --version 2>$null
if (-not $pgVersion) {
    Write-Host "❌ PostgreSQL not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install PostgreSQL:" -ForegroundColor Yellow
    Write-Host "  Option 1: choco install postgresql" -ForegroundColor Cyan
    Write-Host "  Option 2: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ PostgreSQL installed: $pgVersion" -ForegroundColor Green

# Create database
Write-Host ""
Write-Host "Creating database 'globalsecure_test'..." -ForegroundColor Yellow

$createDb = @"
DROP DATABASE IF EXISTS globalsecure_test;
CREATE DATABASE globalsecure_test;
"@

$createDb | psql -U postgres 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database created" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create database" -ForegroundColor Red
    Write-Host "Run manually: psql -U postgres" -ForegroundColor Yellow
    Write-Host "Then: CREATE DATABASE globalsecure_test;" -ForegroundColor Yellow
    exit 1
}

# Apply Prisma schema
Write-Host ""
Write-Host "Applying Prisma schema..." -ForegroundColor Yellow

$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/globalsecure_test"
npx prisma db push --accept-data-loss

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Schema applied" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to apply schema" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Local test database ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Run tests with:" -ForegroundColor Cyan
Write-Host "  npm run test:local" -ForegroundColor White
