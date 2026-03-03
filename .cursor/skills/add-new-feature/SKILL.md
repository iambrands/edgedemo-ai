---
name: add-new-feature
description: End-to-end workflow for adding a new feature to the Edge platform — backend router, mock data, frontend page, navigation, and E2E test. Use when the user asks to add a new feature, create a new page, or build a new module.
---

# Add New Feature

Complete workflow for adding a feature that spans backend API, frontend UI, and tests.

## Step 1: Backend Router

Create `backend/api/{feature_name}.py`:

```python
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/{feature-name}", tags=["{feature-name}"])

@router.get("")
async def list_items():
    return {"items": [], "total": 0}
```

## Step 2: Mock Data Fallback

Add mock data in `backend/api/mock_endpoints.py`:

```python
{feature}_router = APIRouter(prefix="/api/v1/{feature-name}", tags=["{feature-name}-mock"])

@{feature}_router.get("")
async def list_mock_items():
    return {"items": [...], "total": N}
```

Register in `ALL_MOCK_ROUTERS`:
```python
ALL_MOCK_ROUTERS = [
    ...existing...,
    ("{feature_name}", {feature}_router),
]
```

## Step 3: Register in app.py

Add to the `_db_routers` list if DB-dependent:
```python
_db_routers = [
    ...existing...,
    ("{feature_name}", "backend.api.{feature_name}"),
]
```

Or mount directly if no DB needed:
```python
try:
    from backend.api.{feature_name} import router as {feature}_router
    app.include_router({feature}_router)
    _ria_routers_mounted.append("{feature_name}")
except Exception as e:
    _ria_router_errors.append(f"{feature_name}: {type(e).__name__}: {e}")
```

## Step 4: Frontend Page

Create `frontend/src/pages/dashboard/{FeatureName}.tsx`:

```tsx
import { Card } from '../../components/ui/Card';

export default function FeatureName() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Feature Name</h1>
      <Card size="lg">
        {/* Feature content */}
      </Card>
    </div>
  );
}
```

## Step 5: Add Route in App.tsx

```tsx
const FeatureName = lazy(() => import('./pages/dashboard/FeatureName'));

// Inside dashboard routes:
<Route path="feature-name" element={<FeatureName />} />
```

## Step 6: Add Navigation Entry

In `frontend/src/components/dashboard/Sidebar.tsx`, add to the appropriate menu group:
```tsx
{ to: '/dashboard/feature-name', icon: IconName, label: 'Feature Name' }
```

For client portal features, update `frontend/src/components/portal/PortalNav.tsx` instead.

## Step 7: E2E Test

Create `frontend/e2e/dashboard/{feature-name}.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';
import { navigateAndVerify } from '../helpers/navigation';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await page.route('**/api/v1/{feature-name}**', route =>
      route.fulfill({ json: { items: [...], total: N } })
    );
    await navigateAndVerify(page, '/dashboard/{feature-name}', {
      title: 'Feature Name',
    });
  });

  test('loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /feature name/i })).toBeVisible();
  });

  test('no error boundary displayed', async ({ page }) => {
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
```

## Step 8: Verify

1. Run `npx tsc --noEmit` in `frontend/` — zero TypeScript errors
2. Run `npx playwright test e2e/dashboard/{feature-name}.spec.ts` — tests pass
3. Test the endpoint: `curl http://localhost:8000/api/v1/{feature-name}`

## Checklist

- [ ] Backend router created with Pydantic models
- [ ] Mock data added to `mock_endpoints.py` and registered in `ALL_MOCK_ROUTERS`
- [ ] Router registered in `app.py` (with `_db_available` guard if DB-dependent)
- [ ] Frontend page created with proper UI components
- [ ] Route added in `App.tsx`
- [ ] Navigation entry added in Sidebar
- [ ] E2E test created and passing
- [ ] `aria-label` added to any icon-only buttons
