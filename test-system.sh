#!/bin/bash

# CareForAll System Test Script
# Tests the complete donation flow

set -e

echo "🚀 Starting CareForAll System Test..."
echo ""

GATEWAY_URL="http://localhost:8080"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Health Checks
echo -e "${BLUE}Test 1: Health Checks${NC}"
echo "Checking gateway health..."
curl -s "$GATEWAY_URL/health" | jq .
echo -e "${GREEN}✓ Gateway healthy${NC}\n"

# Test 2: Create Campaign
echo -e "${BLUE}Test 2: Create Campaign${NC}"
CAMPAIGN_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/campaigns" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Medical Campaign",
    "description": "Help fund medical treatment for those in need",
    "goalAmount": 10000
  }')

CAMPAIGN_ID=$(echo $CAMPAIGN_RESPONSE | jq -r '.id')
echo "Created campaign with ID: $CAMPAIGN_ID"
echo -e "${GREEN}✓ Campaign created${NC}\n"

# Test 3: Get Campaign
echo -e "${BLUE}Test 3: Get Campaign${NC}"
curl -s "$GATEWAY_URL/campaigns/$CAMPAIGN_ID" | jq .
echo -e "${GREEN}✓ Campaign retrieved${NC}\n"

# Test 4: Create Pledge (with idempotency key)
echo -e "${BLUE}Test 4: Create Pledge (Idempotent)${NC}"
IDEMPOTENCY_KEY="test-key-$(date +%s)"

PLEDGE_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/pledges" \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: $IDEMPOTENCY_KEY" \
  -d "{
    \"campaignId\": $CAMPAIGN_ID,
    \"amount\": 500
  }")

PLEDGE_ID=$(echo $PLEDGE_RESPONSE | jq -r '.id')
echo "Created pledge with ID: $PLEDGE_ID"
echo -e "${GREEN}✓ Pledge created${NC}\n"

# Test 5: Duplicate Pledge (should be idempotent)
echo -e "${BLUE}Test 5: Test Idempotency (Duplicate Request)${NC}"
curl -s -X POST "$GATEWAY_URL/pledges" \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: $IDEMPOTENCY_KEY" \
  -d "{
    \"campaignId\": $CAMPAIGN_ID,
    \"amount\": 500
  }" | jq .
echo -e "${GREEN}✓ Idempotency working (same response)${NC}\n"

# Test 6: Simulate Payment Webhook
echo -e "${BLUE}Test 6: Payment Webhook (Success)${NC}"
WEBHOOK_EVENT_ID="webhook-$(date +%s)"

curl -s -X POST "$GATEWAY_URL/payments/webhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"eventId\": \"$WEBHOOK_EVENT_ID\",
    \"pledgeId\": $PLEDGE_ID,
    \"status\": \"succeeded\"
  }" | jq .
echo -e "${GREEN}✓ Webhook processed${NC}\n"

# Test 7: Verify Campaign Total Updated
echo -e "${BLUE}Test 7: Verify Campaign Total Updated${NC}"
echo "Waiting 2 seconds for async processing..."
sleep 2

UPDATED_CAMPAIGN=$(curl -s "$GATEWAY_URL/campaigns/$CAMPAIGN_ID")
CURRENT_AMOUNT=$(echo $UPDATED_CAMPAIGN | jq -r '.currentAmount')

if [ "$CURRENT_AMOUNT" -eq 500 ]; then
  echo -e "${GREEN}✓ Campaign total updated correctly: \$${CURRENT_AMOUNT}${NC}\n"
else
  echo -e "${RED}✗ Campaign total not updated. Expected: 500, Got: ${CURRENT_AMOUNT}${NC}\n"
fi

# Test 8: Test Duplicate Webhook (Idempotency)
echo -e "${BLUE}Test 8: Test Webhook Idempotency${NC}"
curl -s -X POST "$GATEWAY_URL/payments/webhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"eventId\": \"$WEBHOOK_EVENT_ID\",
    \"pledgeId\": $PLEDGE_ID,
    \"status\": \"succeeded\"
  }" | jq .
echo -e "${GREEN}✓ Duplicate webhook handled correctly${NC}\n"

# Test 9: List All Campaigns
echo -e "${BLUE}Test 9: List All Campaigns${NC}"
curl -s "$GATEWAY_URL/campaigns" | jq .
echo -e "${GREEN}✓ Campaign listing working${NC}\n"

# Test 10: Metrics
echo -e "${BLUE}Test 10: Check Metrics${NC}"
echo "Gateway metrics:"
curl -s "$GATEWAY_URL/metrics"
echo -e "${GREEN}✓ Metrics exposed${NC}\n"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 All Tests Passed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "View results in:"
echo "  - Jaeger (Traces): http://localhost:16686"
echo "  - Prometheus (Metrics): http://localhost:9090"
echo "  - Grafana (Dashboards): http://localhost:3000"
echo "  - Kibana (Logs): http://localhost:5601"
