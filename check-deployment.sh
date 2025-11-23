#!/bin/bash

echo "=== Checking Worker Deployments ==="
echo ""

echo "1. Checking fulfilment-worker logs..."
echo "Run this in separate terminal:"
echo "wrangler tail fulfilment-worker --format pretty"
echo ""

echo "2. Checking order-worker logs..."
echo "Run this in separate terminal:"
echo "wrangler tail order-worker --format pretty"
echo ""

echo "3. Test fulfilment-worker DO directly:"
echo "curl https://fulfilment-worker.guhan2210.workers.dev/api/stock/reserve-for-order \\"
echo "  -X POST \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"order_id\": \"test-123\", \"user_id\": \"user-1\", \"items\": [{\"product_id\": \"mi19e2kg-l8f5f010ac\", \"warehouse_id\": \"wh-chennai-001\", \"quantity\": 1}]}'"
echo ""

echo "4. Check if DO binding exists:"
echo "The error might be that INVENTORY_RESERVATIONS binding is not available in fulfilment-worker"

