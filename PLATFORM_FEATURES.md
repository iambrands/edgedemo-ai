# Edge Platform — Complete Feature Guide

> A comprehensive walkthrough of every feature available to Registered Investment Advisors and their Clients.

---

## Table of Contents

**Part 1: RIA Advisor Portal** (26 pages)
1. [Dashboard](#1-dashboard)
2. [Client Management](#client-management) — Households, Accounts, Bulk Import, Prospects, CRM
3. [Investing](#investing) — Analysis, Stock Screener, Model Portfolios, Trading, Tax Harvest, Alt Assets, Best Execution
4. [Operations](#operations) — Reports, Statements, Billing, Meetings, Liquidity, Custodians
5. [Compliance](#compliance) — Dashboard, Documents, Workflows
6. [Communication](#communication) — Messages, Conversations
7. [AI & Learning](#ai--learning) — AI Chat Widget, Learning Center
8. [Settings](#settings)

**Part 2: Client Portal** (19 pages)
1. [Client Dashboard](#client-dashboard)
2. [My Finances](#my-finances) — Performance, Goals, What-If Scenarios
3. [Tax & Family](#tax--family) — Tax Center, Beneficiaries, Family Dashboard
4. [Documents](#documents) — Statements & Reports, Advisor Updates
5. [Connect](#connect) — Meetings, Messages, Requests
6. [Learn](#client-learning-center)
7. [Account](#client-account) — Notifications, Settings, Risk Profile
8. [Onboarding](#client-onboarding)

---

# Part 1: RIA Advisor Portal

The advisor portal is organized into a left sidebar with collapsible menu groups. Each group expands to show sub-pages. An AI chat widget floats in the bottom-right corner on every page.

---

## 1. Dashboard

**What it does:** The main command center for the advisor's practice.

| Section | Details |
|---------|---------|
| **Welcome Banner** | Branded gradient header with "Welcome back" greeting |
| **KPI Cards** | Total AUM, Households, Accounts, Active Alerts — each with trend indicators |
| **Active Alerts** | High/medium severity compliance and portfolio alerts with action buttons |
| **Recent Activity** | Timeline of recent account changes, trades, and client interactions |
| **Household Overview** | Sortable table of all households with total value, account count, and status |

---

## Client Management

### Households

**What it does:** Manage client families as household groupings with aggregated portfolio views.

- View all households in a card layout with total AUM, account count, and risk level
- Expand any household to see its individual accounts and balances
- Create new households with client name, email, and initial account details
- Link and unlink accounts to household groupings

### Accounts

**What it does:** View and manage every client account across all custodians.

- Sortable table with columns: Account Name, Account Type, Custodian, Balance, Fees, Status
- Sort by any column (name, custodian, balance, fees)
- Filter by account type, custodian, or status
- Quick-access to account details and linked household

### Bulk Import

**What it does:** Onboard an entire client book at once via CSV upload.

- **Upload Zone:** Drag-and-drop or click to select a CSV file
- **Template Download:** Pre-formatted CSV template with all required columns
- **Sample Data:** One-click load sample data for testing
- **Validation Engine:** Checks every row for:
  - Required fields (name, email, account type, custodian, approximate value, risk tolerance)
  - Valid account types (brokerage, traditional IRA, Roth IRA, SEP IRA, SIMPLE IRA, inherited IRA, 401k, 403b, 457b, TSP, pension rollover, variable annuity, joint, trust, custodial, 529)
  - Email format, numeric values, valid risk tolerances
- **Preview Table:** Shows all rows with error highlighting (red badges on invalid fields)
- **Summary Cards:** Valid rows, error rows, unique households, total estimated AUM
- **Import Progress:** Animated progress bar with status updates during import

### Prospects

**What it does:** Track and manage leads through a sales pipeline.

- **Pipeline Summary Cards:** New leads, meetings scheduled, proposals sent, conversion rate
- **Kanban Board:** Drag prospects through stages — New → Contacted → Qualified → Meeting Scheduled → Meeting Done → Proposal Sent → Negotiating → Won / Lost / Nurturing
- **Lead Scoring:** AI-generated score based on AUM potential, engagement, and fit
- **Activity Logging:** Record calls, emails, meetings, and notes against each prospect
- **Proposal Generation:** AI-assisted proposal creation based on prospect profile
- **Add Prospect Modal:** Name, email, phone, estimated AUM, source, notes

### CRM

**What it does:** Full contact relationship management integrated into the platform.

- **Summary Cards:** Total contacts, active clients, total AUM, recent activities
- **Contact List:** Searchable and filterable by status, type, and last activity date
- **Contact Detail View:** Full profile with demographics, account summary, and communication history
- **Activity Timeline:** Chronological log of all interactions (calls, emails, meetings, tasks)
- **Integration Status:** Shows connection status with Salesforce, Redtail, or Wealthbox for bidirectional CRM sync

---

## Investing

### Analysis

**What it does:** AI-powered portfolio analysis across six dimensions.

| Analysis Tool | What It Does |
|--------------|--------------|
| **Portfolio Analysis** | Comprehensive health score (0–100) with letter grade, allocation review, and AI-generated recommendations |
| **Fee Analysis** | Identifies high-fee funds, calculates total cost drag, and suggests lower-cost alternatives |
| **Tax Analysis** | Projects enhanced tax efficiency, identifies harvesting opportunities, and evaluates asset location |
| **Risk Analysis** | Calculates portfolio beta, Sharpe ratio, concentration risk, and drawdown estimates |
| **ETF Builder** | Recommends optimized ETF portfolios based on target allocation and constraints |
| **IPS Generator** | Auto-generates an Investment Policy Statement based on client profile and goals |

Each tool runs against client portfolio data and returns AI-generated insights with specific, actionable recommendations.

### Stock Screener

**What it does:** Screen the stock universe using fundamental criteria.

- **5 Preset Strategies:**
  - **Value Stocks** — Low P/E (< 20), low PEG (< 1.5), positive free cash flow
  - **Growth Stocks** — High earnings growth (> 15%), high revenue growth (> 10%)
  - **Dividend Income** — High yield (> 2.5%), low debt-to-equity (< 2.0), positive FCF
  - **Quality Companies** — Low D/E (< 1.0), high current ratio (> 1.5), consistent growth
  - **GARP** — PEG < 2.0, earnings growth > 10%, P/E < 30
- **12+ Custom Filters:** Max P/E, Max PEG, Min Earnings Growth, Min Revenue Growth, Max Debt/Equity, Min Current Ratio, Min Quick Ratio, Positive FCF, Min FCF Yield, Min Dividend Yield, Max Dividend Yield, Sector filter
- **Results Table:** Ticker, Name, Sector, Market Cap, P/E, PEG, Earnings Growth, Revenue Growth, D/E, Dividend Yield, Price, Change %
- **Sort & Limit:** Sort by any metric, limit result count
- **Production API:** Connects to Tradier or Polygon.io for live market data

### Model Portfolios

**What it does:** Build and manage model portfolios, assign to client accounts, and track drift.

| Tab | What It Does |
|-----|--------------|
| **My Models** | Create and edit custom model portfolios with target allocations per asset class |
| **Marketplace** | Browse and subscribe to third-party model portfolios |
| **Signals** | View rebalance signals when accounts drift from their assigned model; approve or reject each signal |
| **Detail** | View model holdings, allocation pie chart, account assignments, and validation results |

- Drift detection automatically flags accounts that deviate beyond threshold
- One-click rebalance generates trade orders to bring accounts back to target
- Holdings validation ensures all positions are compliant with model constraints

### Trading & Rebalancing

**What it does:** Execute trades and manage portfolio rebalancing.

| Tab | What It Does |
|-----|--------------|
| **Blotter** | Trade creation and order management — enter ticker, shares, side (buy/sell), and submit orders with real-time status tracking |
| **Rebalancing** | View accounts with drift from model targets; one-click rebalance generates trade orders across all drifted positions |
| **Tax Optimization** | Tax-aware trade suggestions that minimize realized gains — shows tax lots with estimated tax impact for each trade |
| **History** | Searchable history of all executed trades with execution price, quantity, and timestamps |

### Tax-Loss Harvesting

**What it does:** Identify and execute tax-loss harvesting opportunities.

- **Summary Cards:** Total opportunities found, harvestable loss amount, estimated tax efficiency gain
- **Opportunity List:** Each position showing current loss, wash sale risk status, and harvestable amount
- **Detail Slide-Out:** Click any opportunity to see:
  - Lot-level breakdown with purchase date and cost basis
  - Replacement security recommendations (correlated ETFs with similar exposure)
  - Wash sale countdown timers (30-day lookback)
  - One-click harvest button to generate the swap trade
- **Wash Sale Windows Tab:** Active wash sale periods with countdown to clearance date

### Alternative Assets

**What it does:** Track private equity, venture capital, hedge funds, and real estate funds.

| Tab | What It Does |
|-----|--------------|
| **Overview** | Summary metrics — Total NAV, Total Commitments, Called Capital, Distributions |
| **Investments** | List of all alternative investments with fund name, strategy, vintage year, commitment, called %, NAV, IRR |
| **Capital Calls** | Pending capital calls with due dates, amounts, and payment workflow |
| **Detail** | Individual fund view with performance history, cash flow timeline, and document library |
| **Analytics** | J-curve visualization showing fund performance trajectory; vintage year analysis; IRR/MOIC calculations |
| **Waterfall** | Distribution waterfall modeling — shows preferred return, catch-up, carried interest splits |

### Best Execution

**What it does:** Monitor trade execution quality for compliance with best execution obligations.

- **Summary Cards:**
  - Average Price Improvement (bps)
  - Execution Quality Score (0–100)
  - Trades Reviewed (count)
  - NBBO Match Rate (percentage)
- **Trade Execution Table:** Every trade with symbol, side, quantity, limit price, execution price, NBBO at time of execution, price improvement, and execution venue
- **Broker Comparison:** Performance cards for each executing broker showing average price improvement, fill rate, and execution speed
- **Quarterly Attestation:** Compliance attestation card with last attestation date and "Attest Now" button

---

## Operations

### Report Builder

**What it does:** Create, customize, and schedule client-ready reports.

- **Templates:** Pre-built templates (Quarterly Review, Annual Summary, Performance Report, Compliance Report)
- **Section Library:** Drag-and-drop sections — Executive Summary, Performance Chart, Asset Allocation, Fee Summary, Holdings Table, Compliance Notes, Disclaimer
- **Builder Interface:** Select template, choose client, toggle sections on/off, preview, and generate PDF
- **Saved Reports:** Library of previously generated reports with download and re-generate options
- **Scheduled Reports:** Automated delivery configuration:
  - Set frequency (weekly, monthly, quarterly, annually)
  - Choose recipients and report type
  - View delivery history with timestamps and status
  - Run now / Pause / Resume controls

### Statements

**What it does:** Upload and parse investment statements from any brokerage.

- **Upload Zone:** Drag-and-drop PDF or CSV files
- **Supported Brokerages:** Fidelity, Schwab, Vanguard, TD Ameritrade, E*TRADE, Interactive Brokers, Robinhood, Merrill Edge, Ally Invest, Webull, M1 Finance, SoFi, Betterment, Wealthfront, Costco 401k, TIAA, and more (17+)
- **Smart Parsing:** Automatically detects brokerage format, extracts holdings (ticker, shares, price, value), and maps to accounts
- **Parsed Statements Table:** Status indicators (Parsed, Processing, Error) with extracted holdings count and date

### Billing

**What it does:** Automate AUM-based fee calculation, invoicing, and payment collection.

| Tab | What It Does |
|-----|--------------|
| **Fee Schedules** | Define tiered fee schedules (e.g., 1.00% on first $1M, 0.75% on next $4M, 0.50% above $5M); multiple schedule support |
| **Clients** | View each client's AUM, assigned fee schedule, calculated quarterly fee, and billing status |
| **Invoices** | Generate invoices, track payment status (Paid, Pending, Overdue), and process collection via Stripe |

- Revenue analytics with monthly trend charts and fee compression tracking
- Supports AUM-based, flat fee, and blended fee structures

### Meetings

**What it does:** Manage client meetings with AI-powered preparation and follow-up.

| Tab | What It Does |
|-----|--------------|
| **Meeting List** | All upcoming and past meetings with client name, type, date, and status |
| **Analysis** | AI-generated meeting analysis — key topics discussed, sentiment, action items, and follow-up recommendations |
| **Transcript** | Full meeting transcript (from audio upload) with speaker labels and timestamps |
| **Actions** | Extracted action items with assignee, due date, status tracking, and completion workflow |

- AI meeting prep generates talking points, portfolio alerts, and suggested discussion topics for each client before the meeting
- Calendar integration via Nylas for Google/Outlook sync

### Liquidity

**What it does:** Plan and execute tax-efficient withdrawals and distributions.

- **Withdrawal Request List:** All pending and completed withdrawal requests with status, amount, and account
- **Create Withdrawal Modal:** Select account, specify amount, choose distribution method
- **Tax-Optimized Lot Selection:** Recommends which lots to sell for minimum tax impact
- **Withdrawal Plan:** Multi-year distribution plan with RMD calculations for retirement accounts
- **Cash Flow Projections:** Projected account balance after withdrawal with timeline chart

### Custodians

**What it does:** Connect and aggregate data from multiple custodians in one unified view.

| Tab | What It Does |
|-----|--------------|
| **Connections** | List of all custodian connections with status (Active, Syncing, Error), last sync time, and account count. Connect new custodians via OAuth. |
| **Portfolio** | Unified view of positions across all custodians — ticker, shares, value, allocation %, custodian source |
| **Accounts** | All accounts across all custodians in one sortable table with balance, type, and custodian mapping |
| **Transactions** | Unified transaction ledger across all connected custodians with date, type, amount, and account |

- Supported custodians: Schwab, Fidelity, Pershing, TD Ameritrade, Vanguard (via Plaid + direct institutional APIs)
- Automated sync with configurable refresh intervals
- Connection management — disconnect, re-authenticate, force sync

---

## Compliance

### Compliance Dashboard

**What it does:** Monitor and manage regulatory compliance for the entire firm.

| Tab | What It Does |
|-----|--------------|
| **Overview** | Compliance score gauge, risk summary cards, open items count, last audit date |
| **Alerts** | Active compliance alerts with severity (High, Medium, Low), category, and resolution workflow |
| **Reviews** | Scheduled compliance reviews with status, due date, and assigned reviewer |
| **Tasks** | Compliance task list with priority, assignee, due date, and completion tracking |
| **Audit** | Timestamped audit log of all compliance-relevant actions — who did what, when, and the outcome |
| **Workflows** | Pre-built workflow templates for common regulatory events (see below) |

**6 Workflow Templates:**

| Workflow | Tasks Included |
|----------|---------------|
| **New Client Onboarding** | KYC verification, risk assessment, IPS creation, account funding, compliance review |
| **Annual Review** | Performance review, risk re-assessment, IPS update, compliance check, fee review |
| **Death of Client/Spouse** | Document collection, beneficiary verification, account retitling, compliance notification |
| **Divorce** | Account separation, QDRO processing, beneficiary updates, compliance review |
| **Rollover Processing** | Plan verification, tax review, transfer paperwork, funding confirmation, compliance log |
| **Account Closure** | Position liquidation, fee settlement, compliance documentation, account termination |

Each workflow tracks progress per task, assigns team members, and logs completion for audit purposes.

### Compliance Documents

**What it does:** Generate and manage regulatory disclosure documents.

- **Document Types:** ADV Part 2B (Brochure Supplement), Form CRS (Client Relationship Summary)
- **Auto-Generation:** AI-assisted content generation based on firm data and regulatory requirements
- **Version Control:** Full version history with timestamps, author, and change notes
- **Approval Workflow:** Draft → Review → Approve → Publish lifecycle
- **Preview:** HTML preview of the document before publishing
- **Archive:** Move outdated versions to archive while maintaining access for audits

---

## Communication

### Messages

**What it does:** Secure, encrypted messaging between advisors and clients.

- **Thread List (Left Panel):** All message threads with client name, last message preview, timestamp, and unread badge
- **Message View (Right Panel):** Chat-style bubbles showing full conversation history
- **Search:** Filter threads by client name or keyword
- **Compose:** Write and send messages with the text input at the bottom
- **Unread Indicators:** Blue badge with count on unread threads
- Designed for FINRA-compliant communication archiving

### Conversations

**What it does:** AI-powered analysis of client conversations for insights and compliance.

| Tab | What It Does |
|-----|--------------|
| **Overview** | Summary metrics — total conversations analyzed, average sentiment, compliance flags, action items generated |
| **Compliance** | Flagged conversations with potential compliance issues — each flag shows the transcript excerpt, risk category, and recommended action |
| **Actions** | AI-extracted action items from conversations with assignee, due date, and status |
| **Detail** | Individual conversation view with full transcript, sentiment timeline, key topics, and compliance assessment |

---

## AI & Learning

### AI Chat Widget

**What it does:** A floating assistant available on every page of the advisor portal.

- **Bottom-Right Bubble:** Blue-to-emerald gradient button, always visible
- **Chat Panel (520px):** Expands to show conversation history with the AI
- **Quick Prompts:** Pre-set buttons for common questions:
  - "Summarize my practice"
  - "Review compliance alerts"
  - "Prepare for next meeting"
  - "Draft a client narrative"
- **Capabilities:** Portfolio questions, compliance checks, meeting preparation, client narrative drafting, general platform help
- Powered by OpenAI GPT-4 with context from the advisor's portfolio data

### Learning Center

**What it does:** Interactive training platform with video courses for RIA users.

- **9 Courses, 35 Lessons** covering every aspect of the platform
- **Categories:** Getting Started, Client Management, Investing, Operations, Compliance, Communication, Advanced AI, Billing
- **Progress Tracking:** Visual progress bar per course, completion percentage
- **Video Player:** Embedded video lessons with HeyGen/Synthesia AI presenter
- **Category Filters:** Filter courses by topic area
- **Total Duration:** ~90 minutes of video content

---

## Settings

**What it does:** Manage the advisor's account configuration.

- **Profile Information:** Name, email, firm name, role
- **API Key Management:** View and regenerate API access keys
- **Notification Preferences:** Toggle email notifications by category (alerts, reports, meetings, compliance)
- **Account Actions:** Account deletion with confirmation

---
---

# Part 2: Client Portal

The client portal provides a clean, approachable interface designed for users who may not be familiar with financial platforms. Navigation is a left sidebar with collapsible groups and friendly labels. An AI chat widget floats in the bottom-right corner on every page.

---

## Client Dashboard

**What it does:** The client's home page with a snapshot of their entire financial picture.

| Section | Details |
|---------|---------|
| **Welcome Banner** | "Welcome back, [first name]" with the date |
| **Portfolio Summary Cards** | Total Portfolio Value, YTD Return (% and $), Number of Accounts, Active Goals |
| **Action Items (Nudges)** | Alerts requiring attention — unsigned documents, upcoming meetings, goal milestones, rebalance suggestions. Each has a dismiss button. |
| **Accounts & Holdings** | Expandable cards for each account showing custodian, balance, and gain/loss. Click to expand and see individual positions (ticker, shares, price, value, cost basis, gain/loss %, asset class). |
| **Quick Links** | Shortcut cards to Goals, Documents, Advisor Updates, and Settings |

---

## My Finances

### Performance

**What it does:** Show clients how their investments are performing.

- **Summary Cards:** Total Value, Total Gain/Loss ($ and %), YTD Return, Since Inception Return
- **Performance Chart Tab:** Interactive line chart comparing portfolio value to benchmark (S&P 500 or custom). Period selector: 1M, 3M, 6M, YTD, 1Y, 3Y, All.
- **Asset Allocation Tab:** Side-by-side pie charts showing current allocation vs. target allocation. Categories: US Equity, International Equity, Fixed Income, Cash, Alternatives.
- **Monthly Returns Tab:** Bar chart of monthly returns vs. benchmark with color coding (green for positive, red for negative)

### Goals

**What it does:** Let clients create and track financial goals.

- **Goal Cards:** Each goal shows name, type (with emoji), target amount, current progress, progress bar, target date, and monthly contribution
- **Goal Types:** Retirement 🏖️, Education 🎓, Home Purchase 🏠, Emergency Fund 🛡️, Wealth Transfer 🎁, Custom ⭐
- **Create Goal Modal:** Select type, enter name, target amount, target date, and optional monthly contribution
- **Progress Tracking:** Percentage complete with color-coded progress bars (green > 75%, amber 50-75%, red < 50%)
- **Delete Goal:** Remove goals that are no longer relevant

### What-If Scenarios

**What it does:** Let clients explore how different choices affect their financial future.

- **Input Panel:**
  - Current age and retirement age sliders
  - Current savings (auto-populated from portfolio)
  - Monthly contribution amount
  - Expected return rate (%)
  - Inflation rate (%)
  - Monthly retirement spending
- **Results Panel:**
  - Summary cards: Projected balance at retirement, success probability, monthly income in retirement
  - Projection chart: Line graph showing portfolio growth over time with retirement date marker
  - Age comparison: Side-by-side showing outcomes at different retirement ages (60, 62, 65, 67, 70)
- Clients can adjust any input and see results update in real time

---

## Tax & Family

### Tax Center

**What it does:** Give clients visibility into their tax situation.

- **Summary Cards:** Total Realized Gains, Total Realized Losses, Net Realized, Estimated Tax Liability
- **Unrealized Gains & Losses:** Table of current positions with unrealized gain/loss amount and percentage
- **Tax-Loss Harvesting:** Highlighted opportunities the advisor has identified
- **Tabs:**
  - **Realized Transactions:** Date, ticker, shares, proceeds, cost basis, gain/loss for every closed position
  - **Tax Lots:** All open tax lots with purchase date, cost basis, holding period (short/long term), and current value
  - **Tax Documents:** Downloadable tax forms (1099-B, 1099-DIV, 1099-INT, K-1s) organized by year

### Beneficiaries

**What it does:** Help clients manage who inherits their accounts.

- **Info Banner:** Expandable explanation of why beneficiary designations matter
- **Accounts Needing Review:** Accounts with missing or outdated beneficiaries, highlighted with warnings
- **Up-to-Date Accounts:** Accounts with current beneficiary designations showing primary and contingent beneficiaries
- **Pending Requests:** Active beneficiary change requests with status tracking
- **Request Update Modal:** Submit a beneficiary change request to the advisor for review and processing (processed via DocuSign for signatures)

### Family Dashboard

**What it does:** Show the household-wide financial picture.

- **Household Summary:** Family name, total household value, combined allocation breakdown
- **Family Members Grid:** Cards for each member showing name, relationship, accounts, and total value
- **Member Detail:** Click into any family member to see their individual accounts, positions, and performance
- **Dependents & Education:** Dependent information with linked 529 education savings plans
- **Joint Accounts:** All joint accounts with co-owner details and balance

---

## Documents

### Statements & Reports

**What it does:** Central location for all account documents.

- **Search Bar:** Search documents by name or keyword
- **Category Filters:** All Documents, Reports, Statements, Tax Documents, Agreements
- **Document List:** Each document shows title, type icon, date, and file size
- **Actions:** View (opens in browser) or Download (saves PDF)
- Types include: Quarterly statements, annual reports, tax documents, account agreements, compliance disclosures

### Advisor Updates (Narratives)

**What it does:** Personalized notes and summaries from the advisor.

- **Narrative Types:** Quarterly Review, Meeting Summary, Market Update
- **List View:** Each update shows title, type badge, date, and read/unread status
- **Expandable Content:** Click to read the full narrative
- **Edit Mode:** For advisor-edited narratives, clients can see tracked changes
- Narratives are AI-generated by the advisor and personalized to the client's portfolio and situation

---

## Connect

### Meetings

**What it does:** Schedule and manage meetings with the advisor.

- **Advisor Card:** Shows advisor name, title, firm, and contact information
- **Upcoming Meetings:** List of scheduled meetings with date, time, type, and join/cancel buttons
- **Booking Wizard (3 steps):**
  1. **Type Selection:** Choose meeting type (Portfolio Review, Financial Planning, Tax Consultation, Quick Check-In, Account Setup)
  2. **Time Selection:** Weekly calendar view showing available time slots. Click a slot to select.
  3. **Confirmation:** Review meeting details and confirm booking
- Calendar integration ensures real-time availability

### Messages

**What it does:** Secure, encrypted messaging with the advisor.

- **Thread List (Left Panel):** All conversations with the advisor, showing last message preview and timestamp
- **Message View (Right Panel):** Full conversation history with chat-style bubbles — client messages on the right, advisor messages on the left
- **Compose:** Text input with send button at the bottom
- **Unread Indicators:** Visual badge on threads with unread messages

### Requests

**What it does:** Submit and track service requests to the advisor.

- **Request Types:**
  - **Withdrawal** — Request a distribution from an account
  - **Contribution** — Add funds to an account
  - **Transfer** — Move assets between accounts
  - **Address Change** — Update mailing or legal address
  - **Document Request** — Request specific documents
  - **Beneficiary Change** — Update account beneficiaries
- **Request Form:** Select type → fill in details → submit for advisor review
- **Request List:** All submitted requests with status badges (Submitted, In Review, Approved, Completed, Rejected)
- **Status Timeline:** Click any request to see its processing history with timestamps

---

## Client Learning Center

**What it does:** Video tutorials that teach clients how to use the portal and understand their finances.

- **7 Courses, 20 Lessons** covering:
  - Getting Started (portal navigation, dashboard overview)
  - Understanding Your Money (performance, allocation, benchmarks)
  - Communication (messaging, meetings)
  - Planning & AI (goals, what-if, AI assistant)
  - Tax Center, Documents, Family & Beneficiaries
- **Progress Tracking:** Visual progress bar and completion count
- **Category Filters:** All Topics, Getting Started, Your Money, Communication, Planning & AI
- **Video Player:** Embedded HeyGen/Synthesia AI presenter videos
- **Total Duration:** ~45 minutes of video content

---

## Client Account

### Notifications

**What it does:** Centralized alert center for all account activity.

- **Filter Tabs:** All / Unread only
- **Notification Types:**
  - 📄 Document — New statements or reports available
  - ⚠️ Alert — Account alerts requiring attention
  - 📅 Meeting — Meeting reminders and confirmations
  - 🎯 Goal — Goal milestones and progress updates
  - 📋 Request — Status changes on submitted requests
  - 📈 Trade — Trade confirmations and rebalance notifications
- **Mark All Read:** One-click button to clear all unread indicators
- **Mark Individual Read:** Click any notification to mark it as read

### Settings

**What it does:** Manage portal preferences and security.

- **Profile:** Client name, email, linked advisor, account details
- **Notification Preferences:** Toggle email notifications by category (statements, alerts, meetings, goals, trades)
- **Security:** Change password, enable/disable two-factor authentication

### Risk Profile

**What it does:** Display and update the client's risk tolerance assessment.

- **View Mode:**
  - Risk Score Card (0–100) with risk category label (Conservative, Moderate, Aggressive, etc.)
  - Recommended Asset Allocation based on score — visual pie chart
- **Questionnaire Mode:**
  - 5-question assessment covering time horizon, loss tolerance, income needs, experience, and goals
  - Progress bar tracking completion
  - Results immediately update the risk score and recommended allocation

### AI Financial Assistant

**What it does:** An AI chatbot that answers questions about the client's accounts.

- **Chat Interface:** Full-page chat view with message history
- **Input Field:** Type a question and press send
- **Follow-Up Suggestions:** After each AI response, suggested follow-up questions appear as clickable chips
- **Topics:** Account balances, performance explanations, goal progress, tax questions, meeting scheduling, general financial literacy
- Guardrailed to provide information only — does not execute trades or make changes

---

## Client Onboarding

**What it does:** Self-service account opening wizard for new clients.

- **7-Step Wizard:**
  1. **Welcome** — Overview of the onboarding process and what to expect
  2. **Personal Information** — Name, address, date of birth, SSN, employment
  3. **Financial Profile** — Income, net worth, liquid assets, investment experience
  4. **Investment Goals** — Primary goal, time horizon, risk preferences
  5. **Risk Assessment** — 5-question risk tolerance questionnaire with immediate scoring
  6. **Documents** — Upload ID, proof of address, and any required documents
  7. **Review & Sign** — Review all entered information and digitally sign agreements

- **Progress Bar:** Visual indicator showing which step the client is on
- **Step Navigation:** Sidebar showing all steps with completed checkmarks
- After completion, the client receives portal access and their advisor is notified

---
---

# Platform-Wide Features

These features span both portals:

| Feature | Description |
|---------|-------------|
| **Floating AI Chat** | Available on every page of both portals. Advisor version has practice-focused prompts; client version has account-focused prompts. |
| **Blue Sidebar Navigation** | Both portals use a collapsible left sidebar with a blue gradient background, grouped menus, and emerald-green active indicators. |
| **Branding** | Blue, white, and green color scheme throughout. Firm name displayed in sidebar header. |
| **Responsive Design** | Tailwind CSS utility classes for responsive layouts |
| **E2E Testing** | 82+ Playwright smoke tests covering every page in both portals |

---

# Feature Count Summary

| Category | RIA Portal | Client Portal |
|----------|-----------|---------------|
| **Total Pages** | 26 | 19 |
| **Menu Groups** | 5 collapsible + Dashboard + standalone items | 4 collapsible + Home + standalone items |
| **Analysis Tools** | 6 (Portfolio, Fee, Tax, Risk, ETF, IPS) | — |
| **Stock Screener Presets** | 5 | — |
| **Workflow Templates** | 6 | — |
| **Supported Brokerages** | 17+ | — |
| **Retirement Plan Types** | 10+ (401k, Roth, IRA, 403b, 457b, TSP, pension, SIMPLE, Inherited, SEP) | — |
| **Video Lessons** | 35 across 9 courses (~90 min) | 20 across 7 courses (~45 min) |
| **Request Types** | — | 6 (Withdrawal, Contribution, Transfer, Address, Document, Beneficiary) |
| **Goal Types** | — | 6 (Retirement, Education, Home, Emergency, Wealth Transfer, Custom) |
| **Meeting Types** | — | 5 (Portfolio Review, Financial Planning, Tax, Quick Check-In, Account Setup) |

---

*Document Version: 1.0*
*Last Updated: February 2026*
*Platform: Edge — Wealth Management Platform for RIAs*
