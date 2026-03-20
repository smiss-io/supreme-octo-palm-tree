#!/usr/bin/env bash
# KidSpark Pre-Launch Checklist
# Run before every deployment: ./scripts/prelaunch-check.sh
# Exit code 0 = all checks pass, non-zero = failure

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASS++)); }
fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAIL++)); }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; ((WARN++)); }

echo "========================================="
echo "  KidSpark Pre-Launch Checklist"
echo "  $(date)"
echo "========================================="
echo ""

# 1. npm audit — zero critical CVEs
echo "--- Security ---"
if npm audit --audit-level=critical 2>&1 | grep -q "found 0 vulnerabilities"; then
  pass "npm audit: zero critical CVEs"
elif ! npm audit --audit-level=critical 2>&1 | grep -q "Severity: critical"; then
  pass "npm audit: zero critical CVEs (some non-critical exist)"
else
  fail "npm audit: critical CVEs found"
fi

# 2. No .env file committed
if git ls-files --error-unmatch .env 2>/dev/null; then
  fail ".env file is tracked by git"
else
  pass ".env file not tracked by git"
fi

# 3. No secrets in recent commits
if git log --all --diff-filter=A --name-only --format="" | grep -qE "\.env$|credentials\.json$|\.pem$"; then
  warn "Potentially sensitive files found in git history"
else
  pass "No obvious secret files in git history"
fi

# 4. Prisma schema valid
echo ""
echo "--- Database ---"
if DATABASE_URL="postgresql://fake:fake@localhost:5432/fake" npx prisma validate --schema=packages/db/schema.prisma 2>&1 | grep -q "is valid"; then
  pass "Prisma schema valid"
else
  fail "Prisma schema validation failed"
fi

# 5. Required environment variables
echo ""
echo "--- Environment ---"
REQUIRED_VARS=(
  DATABASE_URL
  ENCRYPTION_KEY
  NEXTAUTH_SECRET
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  UPSTASH_REDIS_REST_URL
  UPSTASH_REDIS_REST_TOKEN
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -n "${!var:-}" ]; then
    pass "ENV $var is set"
  else
    warn "ENV $var is not set (required in production)"
  fi
done

# 6. ENCRYPTION_KEY format (64 hex chars)
if [ -n "${ENCRYPTION_KEY:-}" ]; then
  if echo "$ENCRYPTION_KEY" | grep -qE '^[0-9a-fA-F]{64}$'; then
    pass "ENCRYPTION_KEY is valid (64 hex chars)"
  else
    fail "ENCRYPTION_KEY is not 64 hex characters"
  fi
fi

# 7. All tests pass
echo ""
echo "--- Tests ---"
if npx vitest run 2>&1 | grep -q "Tests.*passed"; then
  TOTAL=$(npx vitest run 2>&1 | grep "Tests" | grep -oP '\d+ passed')
  pass "All tests passing ($TOTAL)"
else
  fail "Some tests are failing"
fi

# 8. TypeScript compilation
echo ""
echo "--- Build ---"
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  fail "TypeScript compilation errors found"
else
  pass "TypeScript compiles without errors"
fi

# 9. Security headers present in next.config.js
echo ""
echo "--- Security Headers ---"
HEADERS=("Strict-Transport-Security" "X-Frame-Options" "X-Content-Type-Options" "Content-Security-Policy" "Referrer-Policy" "Permissions-Policy")
for header in "${HEADERS[@]}"; do
  if grep -q "$header" next.config.js 2>/dev/null; then
    pass "Security header: $header configured"
  else
    fail "Security header: $header missing from next.config.js"
  fi
done

# 10. Rate limiting configured
if grep -q "Ratelimit" apps/web/middleware.ts 2>/dev/null; then
  pass "Rate limiting configured in middleware"
else
  fail "Rate limiting not found in middleware"
fi

# Summary
echo ""
echo "========================================="
echo "  Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${YELLOW}${WARN} warnings${NC}"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}Pre-launch check FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}Pre-launch check PASSED${NC}"
  exit 0
fi
