"""
Help center endpoints for both RIA advisors and client portal users.
Provides articles, FAQs, and feedback collection.
"""

from fastapi import APIRouter, Query
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/api/v1/help", tags=["Help Center"])

# ---------------------------------------------------------------------------
# Static data (replace with DB in production)
# ---------------------------------------------------------------------------

_ARTICLES = [
    # Getting Started
    {"id": "1", "category": "getting-started", "audience": "ria", "title": "Complete Setup Guide", "excerpt": "Step-by-step guide to setting up your EdgeAI account", "readTime": "10 min", "type": "guide"},
    {"id": "2", "category": "getting-started", "audience": "ria", "title": "Connecting Your First Custodian", "excerpt": "How to link Schwab, Fidelity, or other custodians", "readTime": "5 min", "type": "article"},
    {"id": "3", "category": "getting-started", "audience": "ria", "title": "Platform Overview Video", "excerpt": "Quick tour of all EdgeAI features", "readTime": "8 min", "type": "video"},
    # Client Management
    {"id": "4", "category": "client-management", "audience": "ria", "title": "Adding New Clients", "excerpt": "How to onboard clients through the portal", "readTime": "5 min", "type": "article"},
    {"id": "5", "category": "client-management", "audience": "ria", "title": "Household Setup", "excerpt": "Organizing accounts into households", "readTime": "4 min", "type": "article"},
    {"id": "6", "category": "client-management", "audience": "ria", "title": "Client Portal Customization", "excerpt": "Branding and configuring the client experience", "readTime": "6 min", "type": "guide"},
    # Compliance
    {"id": "7", "category": "compliance", "audience": "ria", "title": "Understanding Compliance Alerts", "excerpt": "How the AI compliance system works", "readTime": "7 min", "type": "article"},
    {"id": "8", "category": "compliance", "audience": "ria", "title": "ADV Part 2B Generator", "excerpt": "Creating and updating your ADV documents", "readTime": "10 min", "type": "guide"},
    {"id": "9", "category": "compliance", "audience": "ria", "title": "Audit Trail & Reporting", "excerpt": "Accessing compliance reports for examinations", "readTime": "5 min", "type": "article"},
    # Analysis
    {"id": "10", "category": "analysis", "audience": "ria", "title": "Running Portfolio Analysis", "excerpt": "How to analyze client portfolios", "readTime": "6 min", "type": "article"},
    {"id": "11", "category": "analysis", "audience": "ria", "title": "Tax-Loss Harvesting", "excerpt": "Identifying and executing tax-saving opportunities", "readTime": "8 min", "type": "guide"},
    {"id": "12", "category": "analysis", "audience": "ria", "title": "Risk Assessment Tools", "excerpt": "Understanding concentration and risk metrics", "readTime": "5 min", "type": "article"},
    # Settings
    {"id": "13", "category": "settings", "audience": "ria", "title": "Managing Your Profile", "excerpt": "Updating personal and firm information", "readTime": "3 min", "type": "article"},
    {"id": "14", "category": "settings", "audience": "ria", "title": "API Keys & Integrations", "excerpt": "Setting up API access for custom integrations", "readTime": "5 min", "type": "article"},
    {"id": "15", "category": "settings", "audience": "ria", "title": "Billing & Subscription", "excerpt": "Managing your plan and payment methods", "readTime": "4 min", "type": "article"},
    # Client articles
    {"id": "c1", "category": "portal-basics", "audience": "client", "title": "Getting Started with Your Portal", "excerpt": "Everything you need to know about your client portal", "readTime": "3 min", "type": "guide"},
    {"id": "c2", "category": "portal-basics", "audience": "client", "title": "Understanding Your Portfolio Summary", "excerpt": "How to read your portfolio overview", "readTime": "5 min", "type": "article"},
    {"id": "c3", "category": "portal-basics", "audience": "client", "title": "How to Read Your Performance Report", "excerpt": "Understanding returns, benchmarks, and fees", "readTime": "4 min", "type": "article"},
    {"id": "c4", "category": "security", "audience": "client", "title": "Keeping Your Account Secure", "excerpt": "Best practices for account security", "readTime": "3 min", "type": "guide"},
]

_RIA_FAQS = [
    {"question": "How do I connect my custodian accounts?", "answer": "Go to Custodians in the sidebar, click \"Connect\" on your custodian, and follow the OAuth authorization flow. Most custodians connect in under 2 minutes."},
    {"question": "Is my client data secure?", "answer": "Yes. EdgeAI uses bank-level 256-bit AES encryption, SOC 2 Type II compliance, and all data is stored in secure AWS data centers. We never share your data with third parties."},
    {"question": "How does the AI compliance monitoring work?", "answer": "Our AI continuously monitors your client portfolios for concentration risk, suitability issues, and regulatory concerns. You'll receive alerts when potential issues are detected, with recommended actions."},
    {"question": "Can I customize the client portal with my branding?", "answer": "Yes! Go to Settings > Branding to upload your logo, set your primary colors, and customize the welcome message your clients see."},
    {"question": "How do I generate compliance documents like Form CRS?", "answer": "Navigate to Compliance Docs, click \"Generate Document\", select the document type, and our AI will pre-fill based on your firm information. You can edit before publishing."},
    {"question": "What custodians do you support?", "answer": "We support Charles Schwab, Fidelity, TD Ameritrade, Pershing, Interactive Brokers, and more. Check the Custodians page for the full list."},
    {"question": "How do I cancel my subscription?", "answer": "Go to Settings > Billing and click \"Cancel Subscription\". You'll retain access until the end of your billing period. Your data will be available for export for 30 days."},
    {"question": "Can I import data from my existing systems?", "answer": "Yes. We support CSV imports for client data, positions, and transactions. Contact support for help with large migrations or custom integrations."},
]

_CLIENT_FAQS = [
    {"category": "Account Access", "question": "How do I log into my client portal?", "answer": "Visit the portal URL provided by your advisor and enter your email and password."},
    {"category": "Account Access", "question": "I forgot my password. How do I reset it?", "answer": "Click \"Forgot Password\" on the login page, enter your email, and we'll send you a reset link."},
    {"category": "Viewing Your Accounts", "question": "How often is my account data updated?", "answer": "Account balances and positions are updated daily. Some custodians provide intraday updates."},
    {"category": "Documents & Reports", "question": "Where can I find my statements?", "answer": "Go to Documents > Statements to view and download your account statements."},
    {"category": "Security & Privacy", "question": "Is my information secure?", "answer": "Yes. We use bank-level 256-bit encryption, and your data is stored in SOC 2 certified data centers."},
]

_FEEDBACK: list = []

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/articles")
async def get_articles(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    audience: str = Query("ria"),
    limit: int = Query(20),
):
    """Get help articles with optional filtering."""
    results = [a for a in _ARTICLES if a["audience"] == audience]
    if category:
        results = [a for a in results if a["category"] == category]
    if search:
        q = search.lower()
        results = [a for a in results if q in a["title"].lower() or q in a["excerpt"].lower()]
    return {"articles": results[:limit], "total": len(results)}


@router.get("/articles/{article_id}")
async def get_article(article_id: str):
    """Get single article by ID."""
    for a in _ARTICLES:
        if a["id"] == article_id:
            return {**a, "content": f"Full content for '{a['title']}' would be loaded from a CMS or database."}
    return {"error": "Article not found"}


@router.get("/faqs")
async def get_faqs(audience: str = Query("ria")):
    """Get FAQs for RIA or client audience."""
    if audience == "client":
        return {"faqs": _CLIENT_FAQS}
    return {"faqs": _RIA_FAQS}


@router.post("/feedback")
async def submit_feedback(article_id: str, helpful: bool, comment: Optional[str] = None):
    """Submit feedback on a help article."""
    entry = {
        "article_id": article_id,
        "helpful": helpful,
        "comment": comment,
        "created_at": datetime.utcnow().isoformat(),
    }
    _FEEDBACK.append(entry)
    return {"status": "ok", "message": "Thank you for your feedback!"}
