#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Production/Staging Verification Script
#
# Creates temporary test accounts, runs automated checks, pauses for ad-hoc
# Maestro testing, then guarantees cleanup via trap.
#
# Usage:
#   ./scripts/verify-production.sh              # defaults to production
#   ./scripts/verify-production.sh staging       # test staging instead
#   ./scripts/verify-production.sh production    # explicit production
#
# Prerequisites:
#   - Railway CLI installed and logged in
#   - Project linked: run `railway link` in backend/ first
#   - jq installed (brew install jq)
# =============================================================================

ENV="${1:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"

# Determine base URL
if [ "$ENV" = "staging" ]; then
    BASE_URL="https://api-staging.taist.app"
else
    BASE_URL="https://api.taist.app"
fi

API_KEY="ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k"

PASS=0
FAIL=0
ACCOUNTS_CREATED=false

# ── Resolve public MySQL proxy for environment ───────────────────────────────
# railway run injects internal DB_HOST which isn't reachable locally.
# We detect the public proxy host/port from the MySQL service's MYSQL_PUBLIC_URL.
resolve_db_proxy() {
    local mysql_svc
    if [ "$ENV" = "staging" ]; then
        mysql_svc="MySQL-Y2bE"
    else
        mysql_svc="MySQL-9ud3"
    fi
    local public_url
    public_url=$(cd "$BACKEND_DIR" && railway variables -e "$ENV" -s "$mysql_svc" --kv 2>/dev/null \
        | grep '^MYSQL_PUBLIC_URL=' | sed 's/^MYSQL_PUBLIC_URL=//')
    if [ -z "$public_url" ]; then
        echo "ERROR: Could not resolve MYSQL_PUBLIC_URL for $ENV" >&2
        exit 1
    fi
    # Parse host and port from mysql://user:pass@host:port/db
    DB_PROXY_HOST=$(echo "$public_url" | sed 's|.*@||; s|:.*||')
    DB_PROXY_PORT=$(echo "$public_url" | sed 's|.*@.*:||; s|/.*||')
}

# ── Helper: run artisan on Railway with public DB proxy ──────────────────────
railway_artisan() {
    cd "$BACKEND_DIR" && railway run -e "$ENV" -- \
        bash -c "export DB_HOST=$DB_PROXY_HOST DB_PORT=$DB_PROXY_PORT; php artisan $*"
}

# ── Cleanup function (runs on ANY exit) ──────────────────────────────────────
cleanup() {
    if [ "$ACCOUNTS_CREATED" = true ]; then
        echo ""
        echo "==> Cleaning up verification accounts on $ENV..."
        railway_artisan "verify:accounts cleanup" 2>&1 || true
        echo "==> Cleanup complete."
    fi
}
trap cleanup EXIT

check_pass() {
    echo "  PASS: $1"
    PASS=$((PASS + 1))
}

check_fail() {
    echo "  FAIL: $1"
    FAIL=$((FAIL + 1))
}

# ── Check prerequisites ─────────────────────────────────────────────────────
echo "==> Verifying prerequisites..."
command -v railway >/dev/null 2>&1 || { echo "ERROR: railway CLI not found. Install with: npm i -g @railway/cli"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "ERROR: jq not found. Install with: brew install jq"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "ERROR: curl not found."; exit 1; }
echo "  Prerequisites OK."

echo ""
echo "==> Resolving DB proxy for $ENV..."
resolve_db_proxy
echo "  DB proxy: $DB_PROXY_HOST:$DB_PROXY_PORT"

# ── Create verification accounts ────────────────────────────────────────────
echo ""
echo "==> Creating verification accounts on $ENV..."
ACCOUNTS_JSON=$(railway_artisan "verify:accounts create --json" 2>&1)

# Validate JSON output
if ! echo "$ACCOUNTS_JSON" | jq . >/dev/null 2>&1; then
    echo "ERROR: Failed to create accounts. Output:"
    echo "$ACCOUNTS_JSON"
    ACCOUNTS_CREATED=false
    exit 1
fi

ACCOUNTS_CREATED=true

CUSTOMER_ID=$(echo "$ACCOUNTS_JSON" | jq -r '.customer_id')
CUSTOMER_TOKEN=$(echo "$ACCOUNTS_JSON" | jq -r '.customer_token')
CUSTOMER_EMAIL=$(echo "$ACCOUNTS_JSON" | jq -r '.customer_email')
CHEF_ID=$(echo "$ACCOUNTS_JSON" | jq -r '.chef_id')
CHEF_TOKEN=$(echo "$ACCOUNTS_JSON" | jq -r '.chef_token')
CHEF_EMAIL=$(echo "$ACCOUNTS_JSON" | jq -r '.chef_email')

echo "  Customer: ID=$CUSTOMER_ID ($CUSTOMER_EMAIL)"
echo "  Chef:     ID=$CHEF_ID ($CHEF_EMAIL)"

# ── Phase 1: Public URL Checks (no auth) ────────────────────────────────────
echo ""
echo "==> Phase 1: Public URL checks on $BASE_URL"

# TMA-036: Privacy policy
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/assets/uploads/html/privacy.html")
[ "$HTTP_CODE" = "200" ] && check_pass "Privacy policy (HTTP $HTTP_CODE)" || check_fail "Privacy policy (HTTP $HTTP_CODE, expected 200)"

# TMA-036: Terms of service
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/assets/uploads/html/terms.html")
[ "$HTTP_CODE" = "200" ] && check_pass "Terms of service (HTTP $HTTP_CODE)" || check_fail "Terms of service (HTTP $HTTP_CODE, expected 200)"

# TMA-064: Account deletion page
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/account-deletion")
[ "$HTTP_CODE" = "200" ] && check_pass "Account deletion page (HTTP $HTTP_CODE)" || check_fail "Account deletion page (HTTP $HTTP_CODE, expected 200)"

# TMA-064: /contact redirect
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L "$BASE_URL/contact" --max-redirs 0 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/contact")
[[ "$HTTP_CODE" =~ ^30[0-9]$ ]] && check_pass "/contact redirect (HTTP $HTTP_CODE)" || check_fail "/contact redirect (HTTP $HTTP_CODE, expected 3xx)"

# TMA-055: /open/inbox deep link
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/open/inbox")
[[ "$HTTP_CODE" =~ ^30[0-9]$ ]] && check_pass "/open/inbox redirect (HTTP $HTTP_CODE)" || check_fail "/open/inbox redirect (HTTP $HTTP_CODE, expected 3xx)"

# ── Phase 2: Authenticated API Checks ───────────────────────────────────────
echo ""
echo "==> Phase 2: Authenticated API checks"

# Chef search from customer perspective (TMA-061)
SEARCH_RESULT=$(curl -s -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -H "apiKey: $API_KEY" \
    "$BASE_URL/mapi/get_search_chefs/$CUSTOMER_ID" 2>/dev/null)
SEARCH_SUCCESS=$(echo "$SEARCH_RESULT" | jq -r '.success // empty' 2>/dev/null)
if [ "$SEARCH_SUCCESS" = "1" ] || [ "$SEARCH_SUCCESS" = "true" ]; then
    CHEF_COUNT=$(echo "$SEARCH_RESULT" | jq '.details | length' 2>/dev/null || echo "?")
    check_pass "Chef search API (success=true, $CHEF_COUNT chef(s))"
else
    check_fail "Chef search API (response: $(echo "$SEARCH_RESULT" | head -c 200))"
fi

# Chef menus retrieval
MENU_RESULT=$(curl -s -H "Authorization: Bearer $CHEF_TOKEN" \
    -H "apiKey: $API_KEY" \
    "$BASE_URL/mapi/get_chef_menus" 2>/dev/null)
MENU_SUCCESS=$(echo "$MENU_RESULT" | jq -r '.success // empty' 2>/dev/null)
if [ "$MENU_SUCCESS" = "1" ] || [ "$MENU_SUCCESS" = "true" ]; then
    check_pass "Chef menus API (success=true)"
else
    check_fail "Chef menus API (response: $(echo "$MENU_RESULT" | head -c 200))"
fi

# Chef availability retrieval
AVAIL_RESULT=$(curl -s -H "Authorization: Bearer $CHEF_TOKEN" \
    -H "apiKey: $API_KEY" \
    "$BASE_URL/mapi/get_availability_by_user_id" 2>/dev/null)
AVAIL_SUCCESS=$(echo "$AVAIL_RESULT" | jq -r '.success // empty' 2>/dev/null)
if [ "$AVAIL_SUCCESS" = "1" ] || [ "$AVAIL_SUCCESS" = "true" ]; then
    check_pass "Chef availability API (success=true)"
else
    check_fail "Chef availability API (response: $(echo "$AVAIL_RESULT" | head -c 200))"
fi

# ── Phase 3: Summary + Pause for Maestro ────────────────────────────────────
echo ""
echo "============================================"
echo "  Automated checks: $PASS passed, $FAIL failed"
echo "============================================"
echo ""
echo "Temp accounts are live on $ENV:"
echo "  Customer: $CUSTOMER_EMAIL  token=$CUSTOMER_TOKEN"
echo "  Chef:     $CHEF_EMAIL  token=$CHEF_TOKEN"
echo ""
echo "Run ad-hoc Maestro tests now (via MCP or CLI)."
echo "When finished, press Enter to clean up accounts."
echo "(Ctrl+C also triggers cleanup.)"
echo ""
read -r -p "Press Enter to cleanup and exit..."

# EXIT trap fires here -> cleanup()
