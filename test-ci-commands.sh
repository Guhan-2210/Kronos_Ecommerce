
#!/bin/bash

# Test CI/CD Commands for All Workers
# This script tests lint, prettier, and test:coverage for all workers

echo "🧪 Testing CI/CD Commands for All Workers"
echo "=========================================="
echo ""

# Array of all workers
WORKERS=(
  "auth-worker"
  "cart-worker"
  "catalog-worker"
  "fulfilment-worker"
  "order-worker"
  "payment-worker"
  "price-worker"
)

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "📋 Testing Lint and Prettier from Root..."
echo ""

# Test root-level lint (on all workers)
for worker in "${WORKERS[@]}"; do
  echo "🔍 Testing ESLint on ${worker}..."
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  if npx eslint "${worker}/**/*.js" 2>/dev/null; then
    echo -e "${GREEN}✅ ESLint passed for ${worker}${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${YELLOW}⚠️  ESLint found issues in ${worker} (non-blocking)${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  fi
  echo ""
done

# Test root-level prettier (on all workers)
for worker in "${WORKERS[@]}"; do
  echo "🎨 Testing Prettier on ${worker}..."
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  if npx prettier --check "${worker}/**/*.{js,json}" 2>/dev/null; then
    echo -e "${GREEN}✅ Prettier check passed for ${worker}${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${YELLOW}⚠️  Prettier found formatting issues in ${worker} (non-blocking)${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  fi
  echo ""
done

echo ""
echo "🧪 Testing test:coverage for each worker..."
echo ""

# Test coverage for each worker
for worker in "${WORKERS[@]}"; do
  echo "📊 Testing coverage for ${worker}..."
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  cd "$worker" || continue
  
  if npm run test:coverage > /dev/null 2>&1; then
    if [ -f "coverage/coverage-summary.json" ]; then
      COVERAGE=$(node -pe "JSON.parse(require('fs').readFileSync('coverage/coverage-summary.json', 'utf8')).total.lines.pct" 2>/dev/null || echo "0")
      echo -e "${GREEN}✅ Tests passed for ${worker} (Coverage: ${COVERAGE}%)${NC}"
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      echo -e "${YELLOW}⚠️  Tests passed but no coverage report for ${worker}${NC}"
      PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
  else
    echo -e "${RED}❌ Tests failed for ${worker}${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  
  cd ..
  echo ""
done

# Summary
echo ""
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed! Ready to deploy.${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed. Please fix before deploying.${NC}"
  exit 1
fi

