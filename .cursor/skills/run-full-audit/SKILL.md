---
name: run-full-audit
description: Run a complete production readiness audit — API endpoint testing, E2E test suite, production verification, and error detection. Use when the user asks to audit, test, verify production, run E2E tests, or check for broken endpoints.
---

# Run Full Audit

Systematic audit of the Edge platform covering API health, E2E tests, and production verification.

## Phase 1: Local API Endpoint Audit

Test all registered endpoints return non-500 status codes:

```bash
cd /Users/iabadvisors/Projects/edgeai-demo
DATABASE_URL="" python -c "
import sys, asyncio
sys.path.insert(0, '.')
from httpx import AsyncClient, ASGITransport
from backend.app import app

async def test():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as c:
        # Login first
        r = await c.post('/api/v1/auth/login', json={
            'email': 'leslie@iabadvisors.com',
            'password': 'CreateWealth2026\$'
        })
        token = r.json().get('access_token', '') if r.status_code == 200 else ''
        h = {'Authorization': f'Bearer {token}'} if token else {}

        endpoints = [
            ('GET', '/api/health'),
            ('GET', '/api/v1/prospects'),
            ('GET', '/api/v1/prospects/pipeline/summary'),
            ('GET', '/api/v1/custodians/connections'),
            ('GET', '/api/v1/tax-harvest/opportunities'),
            ('GET', '/api/v1/model-portfolios'),
            ('GET', '/api/v1/alternative-assets'),
            ('GET', '/api/v1/conversations/analyses'),
            ('GET', '/api/v1/liquidity/withdrawals'),
            ('GET', '/api/v1/compliance/documents'),
            ('GET', '/api/v1/meetings'),
            ('GET', '/api/v1/screener/sectors'),
            ('GET', '/api/v1/messaging/threads'),
            ('GET', '/api/v1/workflows/templates'),
            ('GET', '/api/v1/best-execution/summary'),
            ('GET', '/api/v1/portal/dashboard'),
            ('GET', '/api/v1/portal/goals'),
            ('GET', '/api/v1/portal/notifications'),
            # Compliance Co-Pilot
            ('GET', '/api/v1/compliance/dashboard'),
            ('GET', '/api/v1/compliance/alerts'),
            ('GET', '/api/v1/compliance/tasks'),
            ('GET', '/api/v1/compliance/audit-trail'),
            # Competitive gap features
            ('GET', '/api/v1/custodian-feeds/connections'),
            ('GET', '/api/v1/performance/firm/summary'),
            ('GET', '/api/v1/documents'),
            ('GET', '/api/v1/firm/profile'),
            ('GET', '/api/v1/firm/advisors'),
            ('GET', '/api/v1/rebalancing/drift'),
            ('GET', '/api/v1/planning/estate/hh-001'),
            ('GET', '/api/v1/archive/dashboard'),
            ('GET', '/api/v1/engagement/dashboard'),
            ('GET', '/api/v1/crm-integrations/integrations'),
            ('GET', '/api/v1/direct-indexing/indices'),
        ]
        fails = 0
        for method, path in endpoints:
            r = await c.get(path, headers=h) if method == 'GET' else await c.post(path, json={}, headers=h)
            ok = '✓' if r.status_code < 500 else '✗'
            if r.status_code >= 500: fails += 1
            print(f'  {ok} {r.status_code} {method} {path}')
        print(f'\nFailed (500+): {fails}')

asyncio.run(test())
"
```

**If any 500 errors**: Investigate the failing endpoint. Most common cause is a DB-dependent router that needs to be added to `_db_routers` in `backend/app.py` with mock fallback in `backend/api/mock_endpoints.py`.

## Phase 2: E2E Test Suite

```bash
cd frontend
npx playwright test --reporter=list
```

Expected: 293 tests, all passing. Common failure patterns:
- **Strict mode violation**: Locator matches multiple elements — use `.first()` or narrow selector
- **Tab role mismatch**: Use `getByRole('tab')` not `getByRole('button')` for tab elements
- **Clipboard errors**: `navigator.clipboard` needs try/catch for headless compatibility
- **Timeout**: Increase `waitForTimeout` or add `{ timeout: 10_000 }` to assertions

## Phase 3: Production Verification

```bash
BASE="https://edgedemo-ai-production.up.railway.app"

echo "=== Health ===" && curl -s "$BASE/api/health" | python3 -m json.tool

echo "=== Key Endpoints ==="
for ep in /api/v1/prospects /api/v1/custodians/connections /api/v1/meetings /api/v1/screener/sectors /api/v1/portal/dashboard; do
  echo -n "$ep: " && curl -s -w "%{http_code}" -o /dev/null "$BASE$ep" && echo
done

echo "=== Frontend ===" && curl -s "$BASE/" | head -1
```

## Phase 4: Browser Verification

Use the browser tool to:
1. Navigate to production login page
2. Log in with `leslie@iabadvisors.com` / `CreateWealth2026$`
3. Visit the page(s) the user reported issues on
4. Take screenshots to confirm rendering

## Report Template

After completing all phases, summarize:
- **API Audit**: X/Y endpoints passing (list any failures)
- **E2E Tests**: X/Y passing (list any failures with root cause)
- **Production**: Health status, frontend serving, key endpoints
- **Fixes Applied**: List any code changes made during the audit
