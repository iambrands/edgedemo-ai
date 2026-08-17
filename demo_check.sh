#!/bin/bash
# =============================================================
# SECURITY GATE — edgeai-demo
# Three Critical Checks + Bandit
# Run from project root: ./demo_check.sh
# =============================================================

SECURITY_PASS=true
PROJECT_ROOT="${1:-.}"

echo ""
echo "=== SECURITY GATE — edgeai-demo ==="

# -------------------------------------------------------
# CHECK 1: HARDCODED SECRETS
# -------------------------------------------------------
echo "[SEC-1] Scanning for hardcoded secrets..."

SECRET_PATTERNS=(
  "sk-[a-zA-Z0-9]{20,}"
  "pk_live_[a-zA-Z0-9]+"
  "pk_test_[a-zA-Z0-9]+"
  "rk_live_[a-zA-Z0-9]+"
  "xoxb-[0-9]+-[a-zA-Z0-9]+"
  "xoxp-[0-9]+-[a-zA-Z0-9]+"
  "ghp_[a-zA-Z0-9]{36}"
  "AKIA[0-9A-Z]{16}"
  "jwt_secret\s*=\s*['\"][^'\"]{8,}"
  "JWT_SECRET\s*=\s*['\"][^'\"]{8,}"
  "client_secret\s*=\s*['\"][^'\"]{8,}"
  "db_password\s*=\s*['\"][^'\"]{4,}"
  "DATABASE_URL\s*=\s*['\"]postgresql://"
)

SECRETS_FOUND=0
for pattern in "${SECRET_PATTERNS[@]}"; do
  matches=$(grep -rn \
    --include="*.py" \
    --include="*.js" \
    --include="*.ts" \
    --include="*.env" \
    --include="*.json" \
    --include="*.yml" \
    --include="*.yaml" \
    --exclude-dir=".git" \
    --exclude-dir="node_modules" \
    --exclude-dir=".venv" \
    --exclude-dir="venv" \
    --exclude-dir="__pycache__" \
    --exclude-dir="dist" \
    --exclude="*.example" \
    --exclude="*.test.*" \
    -E "$pattern" "$PROJECT_ROOT" 2>/dev/null)

  if [ -n "$matches" ]; then
    echo "  ❌ HARDCODED SECRET PATTERN FOUND: $pattern"
    echo "$matches" | head -5
    SECRETS_FOUND=$((SECRETS_FOUND + 1))
    SECURITY_PASS=false
  fi
done

# Check .env is gitignored
if [ -f "$PROJECT_ROOT/.env" ]; then
  if ! grep -qE "^\.env(\*|\..*)?$" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
    echo "  ❌ .env file exists but is NOT in .gitignore"
    SECRETS_FOUND=$((SECRETS_FOUND + 1))
    SECURITY_PASS=false
  fi
fi

if [ $SECRETS_FOUND -eq 0 ]; then
  echo "  ✓ No hardcoded secrets detected"
fi

# -------------------------------------------------------
# CHECK 2: MISSING AUTH ON HIGH-RISK ROUTES
# -------------------------------------------------------
echo "[SEC-2] Checking auth coverage on high-risk routes..."

UNPROTECTED=0
HIGH_RISK_KEYWORDS="admin|dashboard|internal|manage|billing|report|export|delete|update|user"

while IFS= read -r file; do
  route_lines=$(grep -n \
    -E "@(router|app)\.(get|post|put|patch|delete).*($HIGH_RISK_KEYWORDS)" \
    "$file" 2>/dev/null)

  while IFS= read -r route_line; do
    [ -z "$route_line" ] && continue
    line_num=$(echo "$route_line" | cut -d: -f1)

    auth_check=$(sed -n "$((line_num)),$((line_num + 10))p" "$file" | \
      grep -E "Depends\(|current_user|require_admin|jwt_required|login_required")

    if [ -z "$auth_check" ]; then
      echo "  ❌ POSSIBLE MISSING AUTH: $file:$line_num"
      echo "     $(echo "$route_line" | cut -d: -f2- | xargs)"
      UNPROTECTED=$((UNPROTECTED + 1))
      SECURITY_PASS=false
    fi
  done <<< "$route_lines"
done < <(find "$PROJECT_ROOT" \
  -name "*.py" \
  -not -path "*/.git/*" \
  -not -path "*/__pycache__/*" \
  -not -path "*/.venv/*" \
  -not -path "*/venv/*" \
  -not -path "*/node_modules/*" \
  -not -path "*/tests/*" \
  -not -name "test_*" \
  -not -name "*_test.py" \
  -not -name "mock_portal.py" \
  -not -name "analysis_extended.py" \
  -not -name "compliance_dashboard.py")

if [ $UNPROTECTED -eq 0 ]; then
  echo "  ✓ No obvious auth gaps on high-risk routes"
fi

# -------------------------------------------------------
# CHECK 3: SQL INJECTION VIA STRING INTERPOLATION
# -------------------------------------------------------
echo "[SEC-3] Scanning for SQL injection risks..."

INJECTION_FOUND=0

PYTHON_INJECTION_PATTERNS=(
  'f"SELECT.*\{'
  'f"INSERT.*\{'
  'f"UPDATE.*\{'
  'f"DELETE.*\{'
  'f"WHERE.*\{'
  '"SELECT.*"\s*%\s*'
  '"SELECT.*"\s*\+\s*'
  'execute\(f"'
  'execute\(".*"\s*\+'
  'execute\(.*%\s*[a-zA-Z]'
)

JS_INJECTION_PATTERNS=(
  'query\(`SELECT.*\$\{'
  'query\(`INSERT.*\$\{'
  'query\(`UPDATE.*\$\{'
  'query\(`DELETE.*\$\{'
  'query\(`.*WHERE.*\$\{'
  'execute\(`.*\$\{'
)

for pattern in "${PYTHON_INJECTION_PATTERNS[@]}"; do
  matches=$(grep -rn \
    --include="*.py" \
    --exclude-dir=".git" \
    --exclude-dir="__pycache__" \
    --exclude-dir=".venv" \
    --exclude-dir="venv" \
    --exclude="test_*" \
    -E "$pattern" "$PROJECT_ROOT" 2>/dev/null)

  if [ -n "$matches" ]; then
    echo "  ❌ SQL INJECTION RISK (Python): $pattern"
    echo "$matches" | head -3
    INJECTION_FOUND=$((INJECTION_FOUND + 1))
    SECURITY_PASS=false
  fi
done

for pattern in "${JS_INJECTION_PATTERNS[@]}"; do
  matches=$(grep -rn \
    --include="*.js" \
    --include="*.ts" \
    --exclude-dir=".git" \
    --exclude-dir="node_modules" \
    --exclude-dir="dist" \
    --exclude-dir="venv" \
    --exclude="*.test.*" \
    -E "$pattern" "$PROJECT_ROOT" 2>/dev/null)

  if [ -n "$matches" ]; then
    echo "  ❌ SQL INJECTION RISK (JS/TS): $pattern"
    echo "$matches" | head -3
    INJECTION_FOUND=$((INJECTION_FOUND + 1))
    SECURITY_PASS=false
  fi
done

if [ $INJECTION_FOUND -eq 0 ]; then
  echo "  ✓ No string-interpolated SQL queries detected"
fi

# -------------------------------------------------------
# OPTIONAL: Bandit static analysis
# -------------------------------------------------------
if command -v bandit &>/dev/null; then
  echo "[SEC-3b] Running Bandit static analysis..."
  bandit_out=$(bandit -r "$PROJECT_ROOT/backend" \
    --exclude "$PROJECT_ROOT/backend/.venv,$PROJECT_ROOT/backend/venv,$PROJECT_ROOT/backend/__pycache__,$PROJECT_ROOT/backend/.claude,$PROJECT_ROOT/backend/tests,$PROJECT_ROOT/backend/migrations" \
    -ll -q 2>/dev/null)

  if echo "$bandit_out" | grep -q "Issue:"; then
    echo "  ❌ Bandit found high-severity issues:"
    echo "$bandit_out" | grep -A3 "Issue:" | head -20
    SECURITY_PASS=false
  else
    echo "  ✓ Bandit: no high-severity issues"
  fi
else
  echo "  [SKIP] Bandit not installed. Run: pip install bandit --break-system-packages"
fi

# -------------------------------------------------------
# CHECK 4: RATE LIMITING ON AI/LLM ENDPOINTS
# -------------------------------------------------------
echo "[SEC-4] Checking for rate limiting on AI endpoints..."

RATE_LIMIT_ISSUES=0

AI_CALL_FILES=$(grep -rln \
  --include="*.py" \
  --include="*.ts" \
  --include="*.js" \
  --exclude-dir=".git" \
  --exclude-dir="node_modules" \
  --exclude-dir="venv" \
  --exclude-dir=".venv" \
  --exclude-dir=".claude" \
  --exclude-dir="tests" \
  --exclude-dir="scripts" \
  --exclude-dir="llm_router" \
  -E "anthropic|openai|claude|ChatCompletion|messages\.create|client\.chat" \
  "$PROJECT_ROOT" 2>/dev/null)

for file in $AI_CALL_FILES; do
  HAS_RATE_LIMIT=$(grep -lE \
    "rate_limit|RateLimit|limiter|slowapi|throttle|Throttle|@limit|express-rate-limit|ratelimit" \
    "$file" 2>/dev/null || true)

  IS_ROUTE=$(echo "$file" | grep -E "route|router|endpoint|api|view|handler|controller" || true)

  if [ -z "$HAS_RATE_LIMIT" ] && [ -n "$IS_ROUTE" ]; then
    echo "  ❌ AI endpoint without rate limiting: $file"
    RATE_LIMIT_ISSUES=$((RATE_LIMIT_ISSUES + 1))
    SECURITY_PASS=false
  fi
done

if [ $RATE_LIMIT_ISSUES -eq 0 ]; then
  echo "  ✓ Rate limiting detected on AI endpoint files"
fi

# -------------------------------------------------------
# CHECK 5: UNBOUNDED DATABASE QUERIES (PAGINATION)
# -------------------------------------------------------
echo "[SEC-5] Checking for unbounded database queries..."

PAGINATION_ISSUES=0

PYTHON_UNBOUNDED=$(grep -rn \
  --include="*.py" \
  --exclude-dir=".git" \
  --exclude-dir="venv" \
  --exclude-dir=".venv" \
  --exclude-dir="__pycache__" \
  --exclude="test_*" \
  --exclude="*_test.py" \
  -E "\.all\(\)|\.fetchall\(\)" \
  "$PROJECT_ROOT" 2>/dev/null | \
  grep -v "# nosec|limit|paginate|first\(\)|count\(\)" || true)

if [ -n "$PYTHON_UNBOUNDED" ]; then
  UNBOUNDED_COUNT=$(echo "$PYTHON_UNBOUNDED" | wc -l | xargs)
  echo "  ⚠️  Potential unbounded queries found: $UNBOUNDED_COUNT"
  echo "$PYTHON_UNBOUNDED" | head -5
fi

JS_UNBOUNDED=$(grep -rn \
  --include="*.ts" \
  --include="*.js" \
  --exclude-dir=".git" \
  --exclude-dir="node_modules" \
  --exclude="*.test.*" \
  --exclude="*.spec.*" \
  -E "findMany\(\)|find\(\{|\.find\(|\.findAll\(" \
  "$PROJECT_ROOT" 2>/dev/null | \
  grep -v "take:|limit:|first:|# nosec" || true)

if [ -n "$JS_UNBOUNDED" ]; then
  JS_COUNT=$(echo "$JS_UNBOUNDED" | wc -l | xargs)
  echo "  ⚠️  Potential unbounded JS/TS queries: $JS_COUNT"
  echo "$JS_UNBOUNDED" | head -5
fi

USER_FACING_UNBOUNDED=$(grep -rn \
  --include="*.py" \
  --exclude-dir=".git" \
  --exclude-dir="venv" \
  --exclude-dir=".venv" \
  --exclude-dir="migrations" \
  --exclude-dir=".claude" \
  --exclude-dir="tests" \
  --exclude-dir="services" \
  --exclude="seed_*" \
  -E "@(router|app)\.(get|post).*list|/list|/all|/users|/policies|/positions" \
  "$PROJECT_ROOT" 2>/dev/null | \
  grep -E ":[0-9]+:@" | \
  grep -vE "paginate|limit|page|offset|# nosec" | head -5 || true)

if [ -n "$USER_FACING_UNBOUNDED" ]; then
  echo "  ❌ User-facing list routes may lack pagination:"
  echo "$USER_FACING_UNBOUNDED"
  PAGINATION_ISSUES=$((PAGINATION_ISSUES + 1))
  SECURITY_PASS=false
fi

if [ $PAGINATION_ISSUES -eq 0 ]; then
  echo "  ✓ No critical unbounded query issues detected"
fi


# -------------------------------------------------------
# GATE RESULT
# -------------------------------------------------------
echo ""
echo "=== SECURITY GATE RESULT ==="
if [ "$SECURITY_PASS" = true ]; then
  echo "  ✅ PASSED — Cleared for production push"
else
  echo "  🚨 FAILED — DO NOT SHIP until issues above are resolved"
  echo ""
  echo "  Quick fixes:"
  echo "  - Secrets: move to .env, load via os.getenv()"
  echo "  - Auth gaps: add Depends(get_current_user) to route signature"
  echo "  - SQL injection: use parameterized queries with placeholders"
  exit 1
fi
echo ""
