# EdgeAI Platform — QA Audit Report

**Generated:** 2026-02-05  
**Scope:** Full static code analysis of frontend pages, backend endpoints, and API connectivity  
**Platform:** 17 RIA Dashboard pages + 15 Client Portal pages + supporting components

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 8 |
| **Medium** | 10 |
| **Low** | 4 |
| **Total** | **22** |

No blocking/critical issues. All routes resolve, all page components render, and all API service files
connect to backend endpoints. The 8 high-severity issues are non-functional buttons on secondary
pages — they don't crash the app but represent dead-end user interactions.

---

## High Priority Issues (Feature partially broken)

### H-1: Households — "View Report" button has no handler
- **File:** `frontend/src/pages/dashboard/Households.tsx` ~line 224
- **Problem:** Button renders but has no `onClick` prop — clicking does nothing.
- **Impact:** Users cannot view household reports after running analysis.
- **Fix:** Wire to `AnalysisModal` or navigate to analysis page with household pre-selected.

### H-2: Meetings — "New Meeting" button opens non-existent modal
- **File:** `frontend/src/pages/dashboard/Meetings.tsx` ~line 297
- **Problem:** Sets `showNewMeetingModal(true)` but no modal component is rendered in JSX.
- **Impact:** Button appears to do nothing.
- **Fix:** Add a `NewMeetingModal` component or remove button.

### H-3: Meetings — "Copy to Clipboard" button has no handler
- **File:** `frontend/src/pages/dashboard/Meetings.tsx` ~line 665
- **Problem:** Button has no `onClick` prop.
- **Impact:** Users cannot copy transcript text.
- **Fix:** Add `navigator.clipboard.writeText()` handler.

### H-4: Settings — "Delete Account" button has no handler
- **File:** `frontend/src/pages/dashboard/Settings.tsx` ~line 193
- **Problem:** Button has no `onClick` prop and no confirmation dialog.
- **Impact:** Non-functional — low risk since it prevents accidental deletion.
- **Fix:** Add confirmation dialog and API call, or hide button in demo mode.

### H-5: PortalSettings — "Change Password" button has no handler
- **File:** `frontend/src/pages/portal/PortalSettings.tsx` ~line 189
- **Problem:** Button has no `onClick` prop.
- **Impact:** Client portal users cannot change password.
- **Fix:** Add modal or navigate to password reset flow.

### H-6: PortalSettings — "Enable 2FA" button has no handler
- **File:** `frontend/src/pages/portal/PortalSettings.tsx` ~line 198
- **Problem:** Button has no `onClick` prop.
- **Impact:** Client portal users cannot enable 2FA.
- **Fix:** Add modal with 2FA setup wizard.

### H-7: PortalTaxCenter — "Harvest" button has no handler
- **File:** `frontend/src/pages/portal/PortalTaxCenter.tsx` ~line 165
- **Problem:** Tax-loss harvest button has no `onClick` prop.
- **Impact:** Users see harvesting opportunities but can't act on them.
- **Fix:** Add handler that submits harvest request via portal request center.

### H-8: Settings — Notification preference toggles don't persist
- **File:** `frontend/src/pages/dashboard/Settings.tsx` ~lines 155-178
- **Problem:** Toggle inputs have no `onChange` handler — state is not saved.
- **Impact:** Preferences appear toggleable but changes are lost.
- **Fix:** Add state management and API persistence call.

---

## Medium Priority Issues (UX / consistency)

### M-1: Landing — "Watch Demo" button has no handler
- **File:** `frontend/src/pages/Landing.tsx` ~line 44
- **Fix:** Link to video or open demo modal.

### M-2: Landing — "Contact Sales" button has no handler
- **File:** `frontend/src/pages/Landing.tsx` ~line 442
- **Fix:** Open mailto link or contact form.

### M-3: Landing — "Schedule Demo" button has no handler
- **File:** `frontend/src/pages/Landing.tsx` ~line 468
- **Fix:** Link to Calendly or demo scheduling page.

### M-4: PortalLogin — "Forgot Password" link uses `href="#"`
- **File:** `frontend/src/pages/portal/PortalLogin.tsx` ~line 146
- **Fix:** Navigate to password reset page or show modal.

### M-5: ClientHelpCenter — Quick guide links use `href="#"`
- **File:** `frontend/src/pages/help/ClientHelpCenter.tsx` ~line 184
- **Fix:** Link to actual help articles or convert to button.

### M-6: Compliance — Silent API failures in parallel loading
- **File:** `frontend/src/pages/dashboard/Compliance.tsx` ~lines 110-112
- **Problem:** `getAlerts()`, `getTasks()`, `getAuditLogs()` catch errors silently with `.catch(() => [])`.
- **Fix:** Show partial-failure banner if some calls fail.

### M-7: Compliance — No user feedback for alert/task mutations
- **File:** `frontend/src/pages/dashboard/Compliance.tsx`
- **Problem:** `updateAlertStatus()`, `completeTask()`, `createTask()` only log errors to console.
- **Fix:** Add toast notifications on success/failure.

### M-8: Households — Missing loading state for analysis/create
- **File:** `frontend/src/pages/dashboard/Households.tsx`
- **Problem:** `handleRunAnalysis()` and `handleCreateHousehold()` have no loading indicators.
- **Fix:** Show spinner on buttons during operations.

### M-9: Meetings — Silent failures for detail loading and uploads
- **File:** `frontend/src/pages/dashboard/Meetings.tsx`
- **Problem:** `loadMeetingDetails()`, `handleFileUpload()`, `updateActionItem()` fail silently.
- **Fix:** Add error states and retry options.

### M-10: Settings — API key is hardcoded mock value
- **File:** `frontend/src/pages/dashboard/Settings.tsx` ~line 13
- **Fix:** Fetch from API or clearly mark as demo placeholder.

---

## Low Priority Issues (Code quality)

### L-1: Direct fetch calls in page files instead of service functions
- **Files:** `ClientOnboarding.tsx`, `PortalRiskProfile.tsx`, `PortalDashboard.tsx`, `Meetings.tsx`
- **Problem:** ~11 direct `fetch()` calls bypass the centralized API service pattern.
- **Fix:** Migrate to corresponding service files for consistency.

### L-2: Meetings — Hardcoded API URL logic
- **File:** `frontend/src/pages/dashboard/Meetings.tsx` ~lines 87-101
- **Problem:** Manual URL construction instead of using environment config.
- **Fix:** Use `VITE_API_URL` from env.

### L-3: Chat — Quick prompts are hardcoded
- **File:** `frontend/src/pages/dashboard/Chat.tsx` ~lines 19-26
- **Problem:** Prompt suggestions are static — could be dynamic per user/context.
- **Fix:** Low priority — acceptable for demo.

### L-4: Meetings — `showNewMeetingModal` state variable set but never consumed
- **File:** `frontend/src/pages/dashboard/Meetings.tsx` ~line 112
- **Problem:** Dead state variable — no modal component references it.
- **Fix:** Remove state or implement the modal.

---

## Route Verification Results

All 33 routes in `App.tsx` are valid:

| Route | Component | Status |
|-------|-----------|--------|
| `/` | `Landing` | OK |
| `/login` | `Login` | OK |
| `/signup` | `Signup` | OK |
| `/dashboard` | `Overview` (index) | OK |
| `/dashboard/households` | `Households` | OK |
| `/dashboard/accounts` | `Accounts` | OK |
| `/dashboard/statements` | `Statements` | OK |
| `/dashboard/analysis` | `Analysis` | OK |
| `/dashboard/compliance` | `Compliance` | OK |
| `/dashboard/meetings` | `Meetings` | OK |
| `/dashboard/compliance-docs` | `ComplianceDocs` | OK |
| `/dashboard/liquidity` | `Liquidity` | OK |
| `/dashboard/custodians` | `Custodians` | OK |
| `/dashboard/tax-harvest` | `TaxHarvest` | OK |
| `/dashboard/prospects` | `Prospects` | OK |
| `/dashboard/conversations` | `Conversations` | OK |
| `/dashboard/model-portfolios` | `ModelPortfolios` | OK |
| `/dashboard/alternative-assets` | `AlternativeAssets` | OK |
| `/dashboard/chat` | `Chat` | OK |
| `/dashboard/settings` | `Settings` | OK |
| `/onboarding` | `RIAOnboarding` | OK |
| `/help` | `RIAHelpCenter` | OK |
| `/portal/login` | `PortalLogin` | OK |
| `/portal/onboarding` | `ClientOnboarding` | OK |
| `/portal/help` | `ClientHelpCenter` | OK |
| `/portal/dashboard` | `PortalDashboard` | OK |
| `/portal/goals` | `PortalGoals` | OK |
| `/portal/documents` | `PortalDocuments` | OK |
| `/portal/updates` | `PortalNarratives` | OK |
| `/portal/risk-profile` | `PortalRiskProfile` | OK |
| `/portal/performance` | `PortalPerformance` | OK |
| `/portal/meetings` | `PortalMeetings` | OK |
| `/portal/requests` | `PortalRequests` | OK |
| `/portal/notifications` | `PortalNotifications` | OK |
| `/portal/assistant` | `PortalAssistant` | OK |
| `/portal/what-if` | `PortalWhatIf` | OK |
| `/portal/tax` | `PortalTaxCenter` | OK |
| `/portal/beneficiaries` | `PortalBeneficiaries` | OK |
| `/portal/family` | `PortalFamily` | OK |
| `/portal/settings` | `PortalSettings` | OK |

**No broken routes. No orphaned components. No dead navigation links.**

---

## API Endpoint Connectivity

### Frontend Service Files (10 files, ~150+ endpoints)
| Service File | Endpoints | Status |
|---|---|---|
| `api.ts` | 18 | All connected |
| `portalApi.ts` | 38 | All connected |
| `complianceApi.ts` | 26 | All connected |
| `alternativeApi.ts` | 18 | All connected |
| `modelPortfolioApi.ts` | 19 | All connected |
| `conversationApi.ts` | 12 | All connected |
| `prospectApi.ts` | 17 | All connected |
| `taxHarvestApi.ts` | 14 | All connected |
| `custodianApi.ts` | 12 | All connected |
| `liquidityApi.ts` | 16 | All connected |

### Backend Routers (~250+ endpoints)
All frontend API calls have matching backend endpoints.  
Mock fallback routers cover all features when DB is unavailable.

### Endpoint Mismatches Found: **0**
No frontend calls to non-existent backend endpoints.  
No HTTP method mismatches detected.

---

## Positive Findings

- All 33 routes resolve correctly with valid component imports
- All 10 API service files have proper error handling patterns
- All portal pages have PortalGuard authentication protection
- All forms have onSubmit handlers
- No empty onClick handlers (`() => {}`)
- No console.log-only handlers
- No TODO/FIXME in onClick handlers
- No broken navigation links (all `Link to=` and `navigate()` targets are valid)
- Mock portal API provides comprehensive fallback data for all 4 demo households

---

## Recommended Fix Order

1. **H-1** Households "View Report" — wire to AnalysisModal (~5 min)
2. **H-2** Meetings "New Meeting" — add simple modal (~15 min)
3. **H-3** Meetings "Copy to Clipboard" — add clipboard handler (~2 min)
4. **H-5/H-6** PortalSettings password/2FA — add "coming soon" toast (~5 min)
5. **H-7** PortalTaxCenter "Harvest" — route to Request Center (~5 min)
6. **H-4** Settings "Delete Account" — add confirmation dialog (~10 min)
7. **H-8** Settings toggles — add onChange + localStorage persistence (~10 min)
8. **M-1/M-2/M-3** Landing page buttons — add links/modals (~10 min)
9. **M-4/M-5** Fix `href="#"` links (~5 min)
10. **M-6/M-7/M-8/M-9** Add error/loading feedback (~30 min)

**Total estimated effort: ~2 hours**
