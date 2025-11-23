#!/bin/bash

# Direct DO Testing Script
# Tests the DO endpoints directly (useful for debugging)

echo "=== Testing Durable Objects Inventory Reservation ==="
echo ""

# Replace with your worker URL
WORKER_URL="https://fulfilment-worker.YOUR_DOMAIN.workers.dev"
PRODUCT_ID="PROD-001"
WAREHOUSE_ID="WH-CENTRAL-01"
ORDER_ID="test-order-$(date +%s)"

echo "Testing with:"
echo "  Product: $PRODUCT_ID"
echo "  Warehouse: $WAREHOUSE_ID"
echo "  Order: $ORDER_ID"
echo ""

# Test 1: Check stock availability
echo "1. Checking stock availability..."
curl -X POST "$WORKER_URL/api/stock/check" \
  -H "Content-Type: application/json" \
  -d "{
    \"product_id\": \"$PRODUCT_ID\",
    \"zipcode\": \"600001\",
    \"quantity\": 2
  }"
echo -e "\n"

# Test 2: Reserve stock (requires auth - you'll need to add token)
echo "2. Attempting to reserve stock..."
echo "NOTE: This requires authentication. Use the main test script for full flow."
echo ""

# Test 3: Get DO info (if endpoint exists)
echo "3. Getting DO state info..."
echo "TIP: Add a /api/stock/do-info endpoint to check DO state"
echo ""

echo "=== Test Complete ==="
echo ""
echo "Next steps:"
echo "1. Get auth token: curl -X POST https://auth-worker.../api/auth/login"
echo "2. Place order through cart-worker"
echo "3. Check logs: wrangler tail fulfilment-worker --format pretty"
echo "4. Monitor DO: Look for [DO Reserve], [DO Confirm], [DO Alarm] messages"

