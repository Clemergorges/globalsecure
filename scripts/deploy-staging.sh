#!/bin/bash

# Deploy Staging Script
# Usage: ./deploy-staging.sh

echo " Starting Staging Deployment..."

# 1. Pull latest changes
# git pull origin main

# 2. Build Docker Images
echo " Building Docker Images..."
docker-compose -f docker-compose.staging.yml build

# 3. Run Migrations
echo " Running Database Migrations..."
# Start DB first if not running
docker-compose -f docker-compose.staging.yml up -d db
sleep 5 # Wait for DB
docker-compose -f docker-compose.staging.yml run --rm app npx prisma migrate deploy

# 4. Start Services
echo " Starting Services..."
docker-compose -f docker-compose.staging.yml up -d

# 5. Health Check
echo " Checking Health..."
sleep 10
curl -f http://localhost:3001/api/health || echo "⚠️ Health Check Failed!"

echo "✅ Deployment Complete! Access at http://localhost:3001"
