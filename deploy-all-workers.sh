#!/bin/bash

# Deploy All Workers Script
# This script deploys all 5 Cloudflare Workers in the correct order

set -e  # Exit on error

echo "🚀 Starting deployment of all workers..."
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Deploy Auth Worker
echo -e "${BLUE}📦 Deploying auth-worker...${NC}"
cd auth-worker
wrangler deploy
echo -e "${GREEN}✅ auth-worker deployed successfully${NC}"
echo ""
cd ..

# Deploy Catalog Worker
echo -e "${BLUE}📦 Deploying catalog-worker...${NC}"
cd catalog-worker
wrangler deploy
echo -e "${GREEN}✅ catalog-worker deployed successfully${NC}"
echo ""
cd ..

# Deploy Price Worker
echo -e "${BLUE}📦 Deploying price-worker...${NC}"
cd price-worker
wrangler deploy
echo -e "${GREEN}✅ price-worker deployed successfully${NC}"
echo ""
cd ..

# Deploy Fulfilment Worker
echo -e "${BLUE}📦 Deploying fulfilment-worker...${NC}"
cd fulfilment-worker
wrangler deploy
echo -e "${GREEN}✅ fulfilment-worker deployed successfully${NC}"
echo ""
cd ..

# Deploy Cart Worker (depends on Price and Fulfilment)
echo -e "${BLUE}📦 Deploying cart-worker...${NC}"
cd cart-worker
wrangler deploy
echo -e "${GREEN}✅ cart-worker deployed successfully${NC}"
echo ""
cd ..

echo -e "${BLUE}📦 Deploying payment-worker...${NC}"
cd payment-worker
wrangler deploy
echo -e "${GREEN}✅ payment-worker deployed successfully${NC}"
echo ""
cd ..

echo -e "${BLUE}📦 Deploying order-worker...${NC}"
cd order-worker
wrangler deploy
echo -e "${GREEN}✅ order-worker deployed successfully${NC}"
echo ""
cd ..

echo "================================================"
echo -e "${GREEN}🎉 All workers deployed successfully!${NC}"
echo ""
echo "Your deployed services:"
echo "  • Auth:       https://ecommerce-auth.guhan2210.workers.dev"
echo "  • Catalog:    https://catalog-worker.guhan2210.workers.dev"
echo "  • Cart:       https://cart-worker.guhan2210.workers.dev"
echo "  • Price:      https://price-worker.guhan2210.workers.dev"
echo "  • Fulfilment: https://fulfilment-worker.guhan2210.workers.dev"
echo ""
echo "Test health checks:"
echo "  curl https://cart-worker.guhan2210.workers.dev/health/detailed"
echo ""

