#!/bin/bash
# SAVIOR Full Auth + Payment Flow Test
# Automates magic link request, token extraction, and browser testing

set -e

EMAIL="${1:-test@test.com}"
API_URL="${API_URL:-http://localhost:9080/v1}"
FLOW_DIR="$(dirname "$0")"
RUNNER="/path/to/flow-auto-browser-testing/run.js"

echo "🔐 SAVIOR Auth Flow Test"
echo "========================"
echo "Email: $EMAIL"
echo ""

# Step 1: Request magic link
echo "📧 Requesting magic link..."
RESPONSE=$(curl -s -X POST "${API_URL}/auth/request-access" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${EMAIL}\"}")

echo "Response: $RESPONSE"

# Step 2: Wait a moment for email to be processed
sleep 2

# Step 3: Extract token from tenant logs
echo ""
echo "🔍 Extracting token from tenant logs..."

# Find the tenant container
TENANT_CONTAINER=$(docker ps --filter "name=tenant_" --format "{{.Names}}" | head -1)
if [ -z "$TENANT_CONTAINER" ]; then
  echo "❌ No tenant container found!"
  exit 1
fi
echo "Found tenant container: $TENANT_CONTAINER"

# Get the magic link from logs (look for the URL with token)
MAGIC_LINK=$(docker logs "$TENANT_CONTAINER" 2>&1 | grep -o "http://localhost:5173/auth/verify?token=[^&]*&email=[^[:space:]]*" | tail -1)

if [ -z "$MAGIC_LINK" ]; then
  # Try alternate format
  MAGIC_LINK=$(docker logs "$TENANT_CONTAINER" 2>&1 | grep -o "http://localhost:5175/auth/verify?token=[^&]*&email=[^[:space:]]*" | tail -1)
fi

if [ -z "$MAGIC_LINK" ]; then
  echo "❌ Could not find magic link in logs!"
  echo "Recent tenant logs:"
  docker logs "$TENANT_CONTAINER" 2>&1 | tail -50
  exit 1
fi

echo "Found magic link: $MAGIC_LINK"

# Extract token from URL
TOKEN=$(echo "$MAGIC_LINK" | grep -o 'token=[^&]*' | cut -d= -f2)
if [ -z "$TOKEN" ]; then
  echo "❌ Could not extract token from magic link!"
  exit 1
fi

echo "Extracted token: ${TOKEN:0:8}..."
echo ""

# Step 4: Run the browser test
echo "🌐 Running browser test..."
echo ""

MAGIC_LINK_TOKEN="$TOKEN" EMAIL="$EMAIL" node "$RUNNER" "${FLOW_DIR}/savior-full-flow.yaml" --headless=false --verbose

echo ""
echo "✅ Test complete! Check screenshots/ folder for results."
