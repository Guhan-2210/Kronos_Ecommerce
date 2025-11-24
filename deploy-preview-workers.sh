#!/bin/bash

# Deploy all preview workers in dependency order
# Run this script BEFORE creating a PR to ensure all preview environments exist

set -e  # Exit on error

echo "🚀 Deploying preview workers in dependency order..."
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track the root directory
ROOT_DIR=$(pwd)

# Function to deploy a worker
deploy_worker() {
    local worker=$1
    echo -e "${BLUE}📦 Deploying $worker preview...${NC}"
    cd "$ROOT_DIR/$worker"
    wrangler deploy --env preview
    echo -e "${GREEN}✓ $worker preview deployed${NC}"
    echo ""
}

# Step 1: Deploy workers with NO dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Workers with no dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
deploy_worker "price-worker"
deploy_worker "catalog-worker"
deploy_worker "auth-worker"
deploy_worker "log-consolidator-worker"

# Step 2: Deploy workers with level 1 dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Workers with level 1 dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
deploy_worker "fulfilment-worker"
deploy_worker "payment-worker"

# Step 3: Deploy workers with level 2 dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Workers with level 2 dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
deploy_worker "order-worker"

# Step 4: Deploy workers with level 3 dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Workers with level 3 dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
deploy_worker "cart-worker"

echo ""
echo -e "${GREEN}🎉 All preview workers deployed successfully!${NC}"
echo ""
echo "You can now create PRs without service binding errors."
echo "Preview environments will communicate with each other."

