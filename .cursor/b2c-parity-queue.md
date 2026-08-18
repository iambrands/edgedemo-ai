# Firmum B2C Parity — Task Queue

Agents must read this file at session start to determine the next task and its minimum gate.
Pick the first task with `status: open` whose dependencies are met.

**Gate reference:** See `.cursor/rules/model-gate-b2c-parity.mdc` for model slugs and cost rules.

---

## Already done

### B2C-DONE-01 | Plaid Link + exchange + mock fallback
- **Phase:** 2 | **Status:** done
- **Files:** backend/api/b2c/plaid.py, backend/services/plaid_service.py, frontend/src/components/client/PlaidLinkButton.tsx

### B2C-DONE-02 | Stripe checkout + 6 price IDs wiring
- **Phase:** 2 | **Status:** done
- **Files:** backend/api/b2c/subscription.py, backend/services/stripe_service.py, frontend/src/pages/client/ClientUpgrade.tsx

### B2C-DONE-03 | Advisor connect billing (0.25% platform fee)
- **Phase:** 2 | **Status:** done
- **Files:** backend/services/advisor_billing_service.py, backend/api/ria_connections.py, backend/models/advisor_connection.py

### B2C-DONE-04 | Retirement Monte Carlo planner
- **Phase:** 2 | **Status:** done
- **Files:** frontend/src/pages/client/ClientRetirementPlanner.tsx, backend/api/mock_b2c.py

---

## Phase 1 — Real App Foundation (Weeks 1–3)

Goal: Turn the prototype into a product users don't immediately leave.

### B2C-101 | Persistent client nav shell
- **Phase:** 1 | **Status:** done | **Min gate:** G1
- **Depends on:** —
- **Files:** frontend/src/components/client/ClientNav.tsx (new), frontend/src/components/client/ClientLayout.tsx (new), frontend/src/App.tsx
- **Acceptance:** ✅ Sidebar nav on all /client/* routes with Home, Accounts, Planning, Connect Advisor, Upgrade, Settings. Matches PortalLayout collapsible pattern. Mobile hamburger menu. User menu with logout. B2CGuard redirects unauthenticated users to /client/signup.

### B2C-102 | Hero net worth dashboard + trend chart
- **Phase:** 1 | **Status:** done | **Min gate:** G1
- **Depends on:** B2C-101
- **Files:** frontend/src/pages/client/ClientDIYDashboard.tsx
- **Acceptance:** ✅ Large $125K net worth hero with Recharts AreaChart (12-month gradient area), risk score badge pill (Moderate Growth · 62), 12-mo change indicator (↑ +$19,800), 3 account summary cards (Chase/Fidelity/Vanguard), quick-actions row (PlaidLink + Find advisor + Upgrade), allocation bars, fee analyzer chart, alerts, AI insights, retirement planner CTA, connect/upload section.

### B2C-103 | Demo-populated first-run mock state
- **Phase:** 1 | **Status:** done | **Min gate:** G0
- **Depends on:** —
- **Files:** backend/api/mock_b2c.py
- **Acceptance:** mock_b2c_dashboard returns realistic non-zero data (sample accounts, ~$125K AUM, 3 accounts, 12-month history with growth). Frontend shows real-looking data on first load without any Plaid connection.
- **Resume prompt:** Implement B2C-103: update mock_b2c_dashboard in backend/api/mock_b2c.py to return realistic demo data — 3 sample accounts (checking, brokerage, 401k), ~$125K total AUM, 12-month net_worth_history with realistic growth curve, populated fee_benchmarks and risk_profile. Data should look real enough that a first-time user sees value immediately.

### B2C-104 | 5-step guided onboarding
- **Phase:** 1 | **Status:** done | **Min gate:** G1
- **Depends on:** B2C-101
- **Files:** frontend/src/pages/client/ClientOnboardingPage.tsx
- **Acceptance:** Multi-step wizard: (1) connect account via Plaid, (2) risk profile quiz, (3) set first goal, (4) fee scan preview, (5) dashboard tour. Progress indicator. Skip option. Saves state so user can resume.
- **Resume prompt:** Implement B2C-104: extend ClientOnboardingPage.tsx into a 5-step wizard with progress bar. Steps: connect account (PlaidLinkButton), risk quiz (3 questions), first goal (name + target + date), fee scan preview (show fee_benchmarks data), dashboard tour (highlight key sections). Add skip button and localStorage persistence so users can resume. Redirect to /client/dashboard on completion.

### B2C-105 | DIY goals page (clone portal goals)
- **Phase:** 1 | **Status:** done | **Min gate:** G0.5
- **Depends on:** B2C-101
- **Files:** frontend/src/pages/client/ClientGoals.tsx (new), frontend/src/App.tsx, backend/api/mock_b2c.py
- **Acceptance:** Goals page at /client/goals with progress bars, target dates, funding status. Mock data from backend. Matches portal goals UI patterns.
- **Resume prompt:** Implement B2C-105: create ClientGoals.tsx by adapting patterns from frontend/src/pages/portal/PortalGoals.tsx for the DIY client context. Add route /client/goals in App.tsx. Add mock_b2c_goals endpoint in backend/api/mock_b2c.py returning 3 sample goals (retirement, emergency fund, vacation) with progress percentages and target dates. Use the ClientLayout nav shell from B2C-101.

### B2C-106 | Fee analyzer bar chart component
- **Phase:** 1 | **Status:** done | **Min gate:** G0.5
- **Depends on:** —
- **Files:** frontend/src/components/client/FeeAnalyzerChart.tsx (new), frontend/src/pages/client/ClientDIYDashboard.tsx
- **Acceptance:** Horizontal bar chart comparing user's current fee rate vs robo-advisor avg (0.25%) vs traditional advisor avg (1.0%). Uses fee_benchmarks data from dashboard API.
- **Resume prompt:** Implement B2C-106: create FeeAnalyzerChart.tsx as a horizontal bar chart component. Props: userFeeRate, roboBenchmark (0.25%), traditionalBenchmark (1.0%). Color-code bars (green if below robo, yellow if between, red if above traditional). Show dollar savings estimate based on portfolio value. Import into ClientDIYDashboard.tsx and wire to fee_benchmarks mock data.

### B2C-107 | Forgot password + session timeout
- **Phase:** 1 | **Status:** done | **Min gate:** G1
- **Depends on:** —
- **Files:** backend/api/auth.py, frontend/src/pages/client/ForgotPassword.tsx (new), frontend/src/App.tsx
- **Acceptance:** /client/forgot-password page with email input. Backend endpoint generates mock reset token (no real email in demo). Session tokens expire after 30 minutes of inactivity. Login page links to forgot password.
- **Resume prompt:** Implement B2C-107: add POST /api/v1/b2c/auth/forgot-password endpoint in backend/api/auth.py that accepts email, returns success (mock — no real email send in demo mode). Create ForgotPassword.tsx with email input form at /client/forgot-password. Add JWT expiry check to B2C auth middleware (30-min inactivity timeout). Add "Forgot password?" link on client login page.

### B2C-108 | Phase 1 E2E smoke tests
- **Phase:** 1 | **Status:** done | **Min gate:** G0
- **Depends on:** B2C-101, B2C-102, B2C-104
- **Files:** frontend/e2e/
- **Acceptance:** Playwright tests covering: client login → dashboard renders net worth, nav shell links work, onboarding wizard can be started, goals page loads, fee chart renders.
- **Resume prompt:** Implement B2C-108: add Playwright E2E tests in frontend/e2e/ for Phase 1 B2C features. Test client login flow, verify dashboard shows net worth number, click through nav shell links (Accounts, Planning, Advisor), verify onboarding wizard renders first step, verify goals page loads with mock data.

### B2C-109 | Phase 1 security review
- **Phase:** 1 | **Status:** open | **Min gate:** G2
- **Depends on:** B2C-101, B2C-102, B2C-104, B2C-107
- **Files:** (review only — all Phase 1 changed files)
- **Acceptance:** Opus reviews all Phase 1 diffs for IDOR, XSS, auth bypass, session management issues. No implementation — findings only.
- **Resume prompt:** Review B2C-109: security audit of Phase 1 B2C parity changes. Review files: ClientLayout.tsx, ClientDIYDashboard.tsx, ClientOnboardingPage.tsx, ForgotPassword.tsx, auth.py changes. Check for IDOR (must return 404 not 403), XSS in user inputs, session token handling, auth bypass on /client/* routes. Report findings only — do not implement fixes.

---

## Phase 2 — PFM Core (Weeks 4–8)

Goal: Give users a reason to open the app every week.

### B2C-201 | Plaid transaction sync + spending categories
- **Phase:** 2 | **Status:** done | **Min gate:** G1
- **Depends on:** B2C-DONE-01
- **Files:** backend/services/plaid_service.py, backend/api/b2c/plaid.py, backend/api/mock_b2c.py, frontend/src/pages/client/ClientSpending.tsx (new)
- **Acceptance:** Backend fetches transactions from Plaid, categorizes by Plaid category. Frontend shows spending breakdown by category with monthly totals. Mock fallback with realistic transaction data.
- **Resume prompt:** Implement B2C-201: extend plaid_service.py to sync transactions via Plaid transactions/sync endpoint. Add GET /api/v1/b2c/plaid/transactions endpoint. Create mock_b2c_transactions in mock_b2c.py with 30+ realistic transactions across 6 categories (groceries, dining, transport, utilities, entertainment, shopping). Create ClientSpending.tsx at /client/spending with category pie chart and transaction list.

### B2C-202 | Budget tracking backend + UI
- **Phase:** 2 | **Status:** done | **Min gate:** G1
- **Depends on:** B2C-201
- **Files:** backend/api/b2c/budgets.py (new), backend/api/mock_b2c.py, frontend/src/pages/client/ClientBudgets.tsx (new)
- **Acceptance:** Users can set monthly budgets per category. Dashboard shows budget vs actual with progress bars. Overspend alerts. Mock backend stores budgets in memory.
- **Resume prompt:** Implement B2C-202: create budgets router at backend/api/b2c/budgets.py with GET/POST /api/v1/b2c/budgets endpoints. Add mock budget data in mock_b2c.py (6 categories with limits and current spend). Create ClientBudgets.tsx at /client/budgets with category budget cards showing progress bars (green under 80%, yellow 80-100%, red over 100%). Include "Set Budget" modal for each category.

### B2C-203 | All account types in dashboard
- **Phase:** 2 | **Status:** open | **Min gate:** G0.5 (UI) + G1 (Plaid mapping)
- **Depends on:** B2C-DONE-01
- **Files:** frontend/src/pages/client/ClientDIYDashboard.tsx, backend/api/mock_b2c.py
- **Acceptance:** Dashboard shows checking, savings, credit cards, loans, investment accounts as separate cards grouped by type. Net worth = assets minus liabilities.
- **Resume prompt:** Implement B2C-203: update mock_b2c_dashboard to include accounts grouped by type (depository: checking + savings, investment: brokerage + 401k, credit: 2 credit cards, loan: mortgage). Update ClientDIYDashboard.tsx to render account cards grouped by asset vs liability with subtotals. Net worth = total assets - total liabilities.

### B2C-204 | Net worth chart + period selector
- **Phase:** 2 | **Status:** done | **Min gate:** G0.5
- **Depends on:** B2C-102
- **Files:** frontend/src/components/client/NetWorthChart.tsx (new), frontend/src/pages/client/ClientDIYDashboard.tsx
- **Acceptance:** Full-width line chart with period selector (1M, 6M, YTD, 1Y, All). Replace sparkline with interactive chart. Hover shows exact date + value.
- **Resume prompt:** Implement B2C-204: create NetWorthChart.tsx as an interactive line chart component. Props: data points array, onPeriodChange callback. Add period selector pills (1M, 6M, YTD, 1Y, All) that filter the displayed range. Show hover tooltip with date and formatted dollar amount. Replace NetWorthSparkline in ClientDIYDashboard.tsx with NetWorthChart.

### B2C-205 | Recurring bill detection
- **Phase:** 2 | **Status:** done | **Min gate:** G1
- **Depends on:** B2C-201
- **Files:** backend/services/bill_detection.py (new), backend/api/mock_b2c.py, frontend/src/components/client/RecurringBills.tsx (new)
- **Acceptance:** Backend identifies recurring transactions by merchant + frequency. Frontend shows list with next expected date and monthly total. Mock data with 5-8 subscriptions.
- **Resume prompt:** Implement B2C-205: create bill_detection.py service that groups transactions by merchant name and identifies recurring patterns (weekly, monthly, annual). Add mock_b2c_bills endpoint returning 8 subscriptions (Netflix, Spotify, gym, insurance, phone, internet, cloud storage, news). Create RecurringBills.tsx component showing each bill with amount, frequency, next date, and monthly total at bottom.

### B2C-206 | DIY tax summary card
- **Phase:** 2 | **Status:** done | **Min gate:** G0.5
- **Depends on:** —
- **Files:** frontend/src/components/client/TaxSummaryCard.tsx (new), backend/api/mock_b2c.py
- **Acceptance:** Card showing estimated capital gains (short-term vs long-term), tax-loss harvesting opportunities count, projected tax liability. Mock data.
- **Resume prompt:** Implement B2C-206: add mock_b2c_tax_summary endpoint returning short_term_gains, long_term_gains, tlh_opportunities (count + estimated savings), projected_tax_liability. Create TaxSummaryCard.tsx displaying this data with clear labels and color coding (gains in green, liabilities in amber). Pattern from frontend/src/pages/portal/PortalTaxCenter.tsx for visual style.

### B2C-209 | Phase 2 security review
- **Phase:** 2 | **Status:** open | **Min gate:** G2
- **Depends on:** B2C-201, B2C-202, B2C-205
- **Files:** (review only — all Phase 2 changed files)
- **Acceptance:** Opus reviews all Phase 2 diffs for transaction data exposure, budget manipulation, bill detection edge cases. No implementation — findings only.
- **Resume prompt:** Review B2C-209: security audit of Phase 2 PFM features. Review transaction sync, budget endpoints, bill detection logic. Check for: unauthorized access to other users' transactions (must 404 not 403), budget amount manipulation, Plaid webhook signature validation, mock data not leaking into production paths.

---

## Phase 3 — Hybrid Wedge (Weeks 9–14)

Goal: Build what no competitor can copy.

### B2C-301 | Unified client shell (DIY + advisor-linked modes)
- **Phase:** 3 | **Status:** open | **Min gate:** G1
- **Depends on:** B2C-101
- **Files:** frontend/src/components/client/ClientLayout.tsx, frontend/src/App.tsx
- **Acceptance:** Single shell serves both DIY and advisor-linked clients. Advisor-linked clients see additional nav items (Advisor Activity, Documents, Messages). Mode determined by user profile has_advisor flag. Unified /client/* routes replace split /client/ vs /portal/ pattern.
- **Resume prompt:** Implement B2C-301: extend ClientLayout.tsx to support two modes — DIY and advisor-linked. Add has_advisor flag to B2C user profile. When true, show additional nav items: Advisor Activity, Documents, Messages. Begin migrating portal-equivalent features into /client/* namespace. Do not remove /portal/* routes yet (backward compatibility).

### B2C-302 | Advisor transparency dashboard
- **Phase:** 3 | **Status:** open | **Min gate:** G1
- **Depends on:** B2C-301
- **Files:** frontend/src/pages/client/AdvisorTransparency.tsx (new), backend/api/mock_b2c.py
- **Acceptance:** Page showing advisor activity log (trades, rebalances with dates), fee disclosure (AUM fee %, dollar amount, billing period), performance vs benchmark chart. Only visible to advisor-linked clients.
- **Resume prompt:** Implement B2C-302: create AdvisorTransparency.tsx at /client/advisor-activity. Show three sections: activity log (table of advisor actions with dates and descriptions), fee disclosure (current fee rate, YTD fees paid, next billing date), performance chart (portfolio vs S&P 500 benchmark). Add mock data in mock_b2c.py. Gate behind has_advisor flag from user profile.

### B2C-303 | Client–advisor messaging
- **Phase:** 3 | **Status:** open | **Min gate:** G1
- **Depends on:** B2C-301
- **Files:** frontend/src/pages/client/ClientMessages.tsx (new), backend/api/mock_b2c.py
- **Acceptance:** Simple messaging UI for advisor-linked clients. Shows thread with advisor. Send message form. Mock responses. Timestamp display.
- **Resume prompt:** Implement B2C-303: create ClientMessages.tsx at /client/messages. Show a chat-style thread between client and their connected advisor. Mock 5-6 historical messages in mock_b2c.py. Include message input form with send button. Messages display with timestamps and sender labels. Gate behind has_advisor flag.

### B2C-304 | Document vault (real PDF delivery)
- **Phase:** 3 | **Status:** open | **Min gate:** G1
- **Depends on:** B2C-301
- **Files:** frontend/src/pages/client/ClientDocuments.tsx (new), backend/api/mock_b2c.py
- **Acceptance:** Document list showing advisor-shared documents (quarterly reports, tax docs, financial plans). Download button. Upload capability for client documents. Mock file list with types and dates.
- **Resume prompt:** Implement B2C-304: create ClientDocuments.tsx at /client/documents. Show list of documents with name, type (quarterly report, tax document, financial plan), shared date, and download button. Add mock document list in mock_b2c.py. Include client upload zone for sharing documents back to advisor. Gate behind has_advisor flag. Pattern from frontend/src/pages/portal/PortalDocuments.tsx.

### B2C-305 | Household sharing
- **Phase:** 3 | **Status:** open | **Min gate:** G1 (+ G2 migration review)
- **Depends on:** B2C-301
- **Files:** frontend/src/pages/client/ClientHousehold.tsx (new), backend/api/b2c/household.py (new), backend/api/mock_b2c.py
- **Acceptance:** Invite partner by email. Shared net worth view combining both users' accounts. Joint goals. Mock backend accepting invites and returning combined data.
- **Resume prompt:** Implement B2C-305: create household router at backend/api/b2c/household.py with POST /invite (email), GET /members, GET /combined-net-worth. Add mock data for a 2-member household. Create ClientHousehold.tsx at /client/household showing combined net worth, member list, and joint goals. Queue G2 review for the data model migration when DB is available.

### B2C-309 | Phase 3 security review
- **Phase:** 3 | **Status:** open | **Min gate:** G2
- **Depends on:** B2C-301, B2C-302, B2C-303, B2C-304, B2C-305
- **Files:** (review only — all Phase 3 changed files)
- **Acceptance:** Opus reviews unified shell auth, advisor transparency data access, messaging, document upload, household data sharing for IDOR, privilege escalation, data leakage. Findings only.
- **Resume prompt:** Review B2C-309: security audit of Phase 3 hybrid wedge features. Focus on: unified shell mode switching (can DIY user access advisor-linked features?), advisor transparency data isolation, message thread access control, document upload validation (file types, size limits, path traversal), household invite flow (can attacker add themselves to another household?).

---

## Phase 4 — Pull Ahead (Weeks 15–20)

Goal: Features that compound because of the advisor network.

### B2C-401 | Proactive AI insights engine
- **Phase:** 4 | **Status:** open | **Min gate:** G1 (+ G2 guardrails)
- **Depends on:** B2C-201, B2C-202
- **Files:** backend/services/insights_engine.py (new), backend/api/b2c/insights.py (new), frontend/src/components/client/InsightCards.tsx (new)
- **Acceptance:** Backend generates contextual insights from portfolio + spending data (fee savings, rebalance alerts, goal drift, budget warnings). Frontend shows insight cards on dashboard. AI-generated text with guardrails (no specific investment advice).
- **Resume prompt:** Implement B2C-401: create insights_engine.py that generates 3-5 contextual insights based on portfolio and spending data. Types: fee_savings, rebalance_needed, goal_off_track, budget_overspend, tax_opportunity. Create insights router with GET /api/v1/b2c/insights. Create InsightCards.tsx to render on dashboard. Add mock insights in mock_b2c.py. Queue G2 review for AI guardrails (no specific buy/sell recommendations).

### B2C-402 | Mobile PWA + push notifications
- **Phase:** 4 | **Status:** open | **Min gate:** G1
- **Depends on:** B2C-101
- **Files:** frontend/public/manifest.json (new), frontend/public/sw.js (new), frontend/src/
- **Acceptance:** PWA manifest with Firmum branding. Service worker for offline shell. Push notification subscription for budget alerts and advisor messages. Install prompt on mobile.
- **Resume prompt:** Implement B2C-402: add PWA support. Create manifest.json with Firmum name, icons, theme color (#2563EB). Create service worker for offline app shell caching. Add push notification subscription in frontend settings page. Register service worker in index.html. Test install prompt on mobile viewport.

### B2C-403 | Advisor marketplace UI
- **Phase:** 4 | **Status:** open | **Min gate:** G0.5 (UI) + G1 (matching logic)
- **Depends on:** B2C-DONE-03
- **Files:** frontend/src/pages/client/AdvisorMarketplace.tsx (new), backend/api/mock_b2c.py
- **Acceptance:** Browse advisors with filters (specialty, AUM range, fee structure). Advisor profile cards with ratings. Request consultation button. Mock advisor directory with 6-8 advisors.
- **Resume prompt:** Implement B2C-403: create AdvisorMarketplace.tsx at /client/advisors. Show grid of advisor cards with name, photo placeholder, specialty tags, fee range, rating (stars), and "Request Consultation" button. Add filters: specialty (retirement, tax, estate), fee type (flat, AUM%), min AUM. Add mock_b2c_advisors endpoint with 8 sample advisors. Wire request button to existing connect-advisor flow.

### B2C-404 | Social proof / trust page
- **Phase:** 4 | **Status:** open | **Min gate:** G0
- **Depends on:** —
- **Files:** frontend/src/pages/marketing/TrustPage.tsx (new), frontend/src/App.tsx
- **Acceptance:** Public page with security badges (256-bit encryption, SOC 2 intent, bank-level security), testimonials (3-4 mock quotes), NPS score display, press mentions section.
- **Resume prompt:** Implement B2C-404: create TrustPage.tsx at /trust. Sections: security badges row (encryption, SOC 2, bank-level), 3 testimonial cards with quotes and attribution, NPS score display, press/media logos row. All content is static/mock. Add route in App.tsx. Link from marketing footer.

### B2C-405 | Learning center content wiring
- **Phase:** 4 | **Status:** open | **Min gate:** G0
- **Depends on:** —
- **Files:** frontend/src/pages/client/ClientLearning.tsx (new), backend/api/mock_b2c.py
- **Acceptance:** Learning center page with video placeholder cards, article links, and FAQ accordion. Mock content. Ready for HeyGen video pipeline integration.
- **Resume prompt:** Implement B2C-405: create ClientLearning.tsx at /client/learning. Show grid of learning cards with thumbnail placeholder, title, duration, and category tag. Categories: Getting Started, Investing Basics, Tax Planning, Working with an Advisor. Add FAQ accordion below. Add mock_b2c_learning endpoint with 8 content items. Route in App.tsx.

---

## Human queue (G4) — requires manual action

- **H-01** | Create 6 Stripe price IDs in Stripe Dashboard (starter/pro/premium x monthly/annual)
- **H-02** | Set Plaid live credentials in .env.beta (Mac Mini) and .env.production (Mac Studio)
- **H-03** | Set Stripe live keys in .env.beta and .env.production
- **H-04** | Set ENCRYPTION_KEY (Fernet) for Plaid token encryption in both envs
- **H-05** | Add CNAME for app.firmum.ai to Mac Studio cloudflared tunnel
- **H-06** | Legal review of compliance footer and disclaimers
