#!/bin/bash

# Deploy All Workers Script (Non-interactive version)
# This script deploys all Cloudflare Workers in the correct order
# With cookie-based authentication support

set -e  # Exit on error

echo "🚀 Starting automated deployment of all workers to PRODUCTION..."
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track deployment status
DEPLOYED_WORKERS=()
FAILED_WORKERS=()

# Deploy Auth Worker (CRITICAL - handles authentication)
echo -e "${BLUE}📦 [1/8] Deploying auth-worker...${NC}"
echo -e "${YELLOW}   Changes: Cookie-based auth, token persistence${NC}"
cd auth-worker
if wrangler deploy; then
  echo -e "${GREEN}✅ auth-worker deployed successfully${NC}"
  DEPLOYED_WORKERS+=("auth-worker")
else
  echo -e "${RED}❌ auth-worker deployment failed${NC}"
  FAILED_WORKERS+=("auth-worker")
fi
echo ""
cd ..

# Deploy Catalog Worker (Public API - no auth)
echo -e "${BLUE}📦 [2/8] Deploying catalog-worker...${NC}"
cd catalog-worker
if wrangler deploy; then
  echo -e "${GREEN}✅ catalog-worker deployed successfully${NC}"
  DEPLOYED_WORKERS+=("catalog-worker")
else
  echo -e "${RED}❌ catalog-worker deployment failed${NC}"
  FAILED_WORKERS+=("catalog-worker")
fi
echo ""
cd ..

# Deploy Price Worker (Public API - no auth)
echo -e "${BLUE}📦 [3/8] Deploying price-worker...${NC}"
cd price-worker
if wrangler deploy; then
  echo -e "${GREEN}✅ price-worker deployed successfully${NC}"
  DEPLOYED_WORKERS+=("price-worker")
else
  echo -e "${RED}❌ price-worker deployment failed${NC}"
  FAILED_WORKERS+=("price-worker")
fi
echo ""
cd ..

# Deploy Fulfilment Worker (Requires auth)
echo -e "${BLUE}📦 [4/8] Deploying fulfilment-worker...${NC}"
echo -e "${YELLOW}   Changes: Cookie-based auth support${NC}"
cd fulfilment-worker
if wrangler deploy; then
  echo -e "${GREEN}✅ fulfilment-worker deployed successfully${NC}"
  DEPLOYED_WORKERS+=("fulfilment-worker")
else
  echo -e "${RED}❌ fulfilment-worker deployment failed${NC}"
  FAILED_WORKERS+=("fulfilment-worker")
fi
echo ""
cd ..

# Deploy Cart Worker (Requires auth, depends on Price and Fulfilment)
echo -e "${BLUE}📦 [5/8] Deploying cart-worker...${NC}"
echo -e "${YELLOW}   Changes: Cookie-based auth support${NC}"
cd cart-worker
if wrangler deploy; then
  echo -e "${GREEN}✅ cart-worker deployed successfully${NC}"
  DEPLOYED_WORKERS+=("cart-worker")
else
  echo -e "${RED}❌ cart-worker deployment failed${NC}"
  FAILED_WORKERS+=("cart-worker")
fi
echo ""
cd ..

echo -e "${BLUE}📦 [6/8] Deploying payment-worker...${NC}"
cd payment-worker
if wrangler deploy; then
  echo -e "${GREEN}✅ payment-worker deployed successfully${NC}"
  DEPLOYED_WORKERS+=("payment-worker")
else
  echo -e "${RED}❌ payment-worker deployment failed${NC}"
  FAILED_WORKERS+=("payment-worker")
fi
echo ""
cd ..

echo -e "${BLUE}📦 [7/8] Deploying order-worker...${NC}"
cd order-worker
if wrangler deploy; then
  echo -e "${GREEN}✅ order-worker deployed successfully${NC}"
  DEPLOYED_WORKERS+=("order-worker")
else
  echo -e "${RED}❌ order-worker deployment failed${NC}"
  FAILED_WORKERS+=("order-worker")
fi
echo ""
cd ..

echo -e "${BLUE}📦 [8/8] Deploying log-consolidator-worker...${NC}"
cd log-consolidator-worker
if wrangler deploy; then
  echo -e "${GREEN}✅ log-consolidator-worker deployed successfully${NC}"
  DEPLOYED_WORKERS+=("log-consolidator-worker")
else
  echo -e "${RED}❌ log-consolidator-worker deployment failed${NC}"
  FAILED_WORKERS+=("log-consolidator-worker")
fi
echo ""
cd ..

echo "================================================"
echo ""

# Display deployment summary
if [ ${#FAILED_WORKERS[@]} -eq 0 ]; then
  echo -e "${GREEN}🎉 All workers deployed successfully!${NC}"
else
  echo -e "${RED}⚠️  Some workers failed to deploy${NC}"
  echo -e "${RED}Failed workers: ${FAILED_WORKERS[*]}${NC}"
  echo ""
fi

echo ""
echo "📊 Deployment Summary:"
echo "  ✅ Deployed: ${#DEPLOYED_WORKERS[@]}/8"
echo "  ❌ Failed:   ${#FAILED_WORKERS[@]}/8"
echo ""

if [ ${#DEPLOYED_WORKERS[@]} -gt 0 ]; then
  echo "Successfully deployed workers:"
  for worker in "${DEPLOYED_WORKERS[@]}"; do
    echo "  ✅ $worker"
  done
  echo ""
fi

echo "================================================"
echo ""
echo "🌐 Your deployed services:"
echo "  • Auth:       https://ecommerce-auth.guhan2210.workers.dev"
echo "  • Catalog:    https://catalog-worker.guhan2210.workers.dev"
echo "  • Cart:       https://cart-worker.guhan2210.workers.dev"
echo "  • Price:      https://price-worker.guhan2210.workers.dev"
echo "  • Fulfilment: https://fulfilment-worker.guhan2210.workers.dev"
echo "  • Payment:    https://payment-worker.guhan2210.workers.dev"
echo "  • Order:      https://order-worker.guhan2210.workers.dev"
echo "  • Logs:       https://log-consolidator.guhan2210.workers.dev"
echo ""
echo "🔧 Key Changes in This Deployment:"
echo "  ✅ Cookie-based authentication (no localStorage)"
echo "  ✅ Automatic token refresh on 401"
echo "  ✅ Backend reads access_token from cookies"
echo "  ✅ Cross-domain auth with SameSite=None"
echo ""
echo "🧪 Test Commands:"
echo ""
echo "  # Test auth (login)"
echo "  curl -X POST https://ecommerce-auth.guhan2210.workers.dev/auth/login \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"your@email.com\",\"password\":\"yourpassword\"}' \\"
echo "    -c cookies.txt -v"
echo ""
echo "  # Test authenticated request (get user)"
echo "  curl https://ecommerce-auth.guhan2210.workers.dev/user/me \\"
echo "    -b cookies.txt"
echo ""
echo "  # Test cart (with auth)"
echo "  curl https://cart-worker.guhan2210.workers.dev/api/cart/items \\"
echo "    -b cookies.txt"
echo ""
echo "  # Health check"
echo "  curl https://cart-worker.guhan2210.workers.dev/health/detailed"
echo ""

# Exit with error if any deployments failed
if [ ${#FAILED_WORKERS[@]} -gt 0 ]; then
  exit 1
fi

