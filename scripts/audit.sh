#!/bin/bash
set -e

echo "Running security audit..."

# Node.js dependencies — zero critical CVEs allowed
echo "Checking npm dependencies..."
npm audit --audit-level=critical
if [ $? -ne 0 ]; then
  echo "CRITICAL npm vulnerabilities found. Fix before deploying."
  exit 1
fi

echo "npm audit passed (no critical CVEs)"

# Check that no .env files are tracked by git
echo "Checking for tracked .env files..."
if git ls-files --error-unmatch .env 2>/dev/null; then
  echo ".env file is tracked by git! Remove immediately."
  exit 1
fi
if git ls-files --error-unmatch .env.local 2>/dev/null; then
  echo ".env.local file is tracked by git! Remove immediately."
  exit 1
fi
echo "No .env files tracked by git"

# Check for common secret patterns in tracked files
echo "Checking for hardcoded secrets..."
PATTERNS=(
  "sk_live_"
  "sk_test_"
  "whsec_"
  "PRIVATE.KEY"
  "-----BEGIN RSA"
  "-----BEGIN OPENSSH"
)

for pattern in "${PATTERNS[@]}"; do
  if git grep -l "$pattern" -- ':!scripts/audit.sh' ':!docs/' 2>/dev/null; then
    echo "Potential secret found matching pattern: $pattern"
    exit 1
  fi
done
echo "No hardcoded secrets detected"

# Validate Prisma schema
echo "Validating Prisma schema..."
npx prisma validate --schema=packages/db/schema.prisma
echo "Prisma schema valid"

echo ""
echo "Security audit passed"
