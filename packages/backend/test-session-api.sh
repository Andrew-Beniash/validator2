#!/bin/bash

# Session Store API Integration Test
# This script tests the session endpoints

set -e

BASE_URL="http://localhost:5000"
COOKIE_FILE="/tmp/session_test_cookies.txt"

echo "🧪 Session Store API Integration Test"
echo "======================================"
echo ""

# Clean up cookie file
rm -f "$COOKIE_FILE"

echo "1️⃣  Testing health endpoint (should auto-create session)..."
HEALTH=$(curl -s -c "$COOKIE_FILE" "$BASE_URL/api/health")
echo "Response: $HEALTH"
echo ""

echo "2️⃣  Testing session retrieval..."
SESSION=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/session")
echo "Response: $SESSION"
echo ""

echo "3️⃣  Testing session update..."
UPDATE=$(curl -s -b "$COOKIE_FILE" -c "$COOKIE_FILE" \
  -X PUT \
  -H "Content-Type: application/json" \
  -d '{"user":{"id":"test123","email":"test@example.com"},"inputs":{"testData":"hello"}}' \
  "$BASE_URL/api/session")
echo "Response: $UPDATE"
echo ""

echo "4️⃣  Verifying session was updated..."
UPDATED_SESSION=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/session")
echo "Response: $UPDATED_SESSION"
echo ""

echo "5️⃣  Testing protected route..."
PROTECTED=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/protected")
echo "Response: $PROTECTED"
echo ""

echo "6️⃣  Testing validation endpoint (store input)..."
VALIDATE=$(curl -s -b "$COOKIE_FILE" -c "$COOKIE_FILE" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai","model":"gpt-4","input":"test validation"}' \
  "$BASE_URL/api/validate")
echo "Response: $VALIDATE"
echo ""

echo "7️⃣  Testing session stats..."
STATS=$(curl -s "$BASE_URL/api/session/stats")
echo "Response: $STATS"
echo ""

echo "8️⃣  Testing session deletion..."
DELETE=$(curl -s -b "$COOKIE_FILE" -X DELETE "$BASE_URL/api/session")
echo "Response: $DELETE"
echo ""

echo "9️⃣  Verifying session no longer exists..."
AFTER_DELETE=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/session")
echo "Response: $AFTER_DELETE"
echo ""

# Clean up
rm -f "$COOKIE_FILE"

echo "✅ All tests completed!"
