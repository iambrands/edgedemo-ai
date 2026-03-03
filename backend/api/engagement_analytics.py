"""
Client Engagement Analytics — Track portal usage, login frequency,
document views, message response times, and identify at-risk clients.
"""
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/engagement", tags=["Engagement Analytics"])

try:
    from backend.api.auth import get_current_user
except ImportError:
    from api.auth import get_current_user

_now = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Mock Data
# ---------------------------------------------------------------------------

MOCK_CLIENTS = [
    {"id": "cl-001", "name": "Robert & Sarah Williams", "aum": 3765000,
     "advisor": "Leslie Thompson", "segment": "HNW",
     "logins_30d": 12, "documents_viewed_30d": 8, "messages_sent_30d": 3,
     "last_login": (_now - timedelta(days=1)).isoformat(),
     "avg_session_minutes": 14.5, "portal_adoption": True,
     "nps_score": 9, "satisfaction": "promoter",
     "engagement_score": 92, "engagement_trend": "stable",
     "at_risk": False, "tenure_years": 5.2},
    {"id": "cl-002", "name": "Lisa & Tom Anderson", "aum": 2525000,
     "advisor": "Marcus Chen", "segment": "HNW",
     "logins_30d": 8, "documents_viewed_30d": 5, "messages_sent_30d": 2,
     "last_login": (_now - timedelta(days=3)).isoformat(),
     "avg_session_minutes": 11.2, "portal_adoption": True,
     "nps_score": 8, "satisfaction": "promoter",
     "engagement_score": 78, "engagement_trend": "improving",
     "at_risk": False, "tenure_years": 3.8},
    {"id": "cl-003", "name": "David Martinez", "aum": 3200000,
     "advisor": "Leslie Thompson", "segment": "HNW",
     "logins_30d": 2, "documents_viewed_30d": 0, "messages_sent_30d": 0,
     "last_login": (_now - timedelta(days=22)).isoformat(),
     "avg_session_minutes": 3.1, "portal_adoption": True,
     "nps_score": 6, "satisfaction": "passive",
     "engagement_score": 28, "engagement_trend": "declining",
     "at_risk": True, "tenure_years": 2.1},
    {"id": "cl-004", "name": "Jennifer & Michael Park", "aum": 185000,
     "advisor": "Rachel Kim", "segment": "Mass Affluent",
     "logins_30d": 15, "documents_viewed_30d": 12, "messages_sent_30d": 5,
     "last_login": (_now - timedelta(hours=6)).isoformat(),
     "avg_session_minutes": 18.9, "portal_adoption": True,
     "nps_score": 10, "satisfaction": "promoter",
     "engagement_score": 95, "engagement_trend": "improving",
     "at_risk": False, "tenure_years": 1.4},
    {"id": "cl-005", "name": "Kevin & Diana Chen", "aum": 720000,
     "advisor": "Rachel Kim", "segment": "Affluent",
     "logins_30d": 0, "documents_viewed_30d": 0, "messages_sent_30d": 0,
     "last_login": (_now - timedelta(days=45)).isoformat(),
     "avg_session_minutes": 0, "portal_adoption": False,
     "nps_score": None, "satisfaction": "unknown",
     "engagement_score": 8, "engagement_trend": "declining",
     "at_risk": True, "tenure_years": 4.5},
    {"id": "cl-006", "name": "Margaret Wilson", "aum": 1450000,
     "advisor": "Marcus Chen", "segment": "HNW",
     "logins_30d": 6, "documents_viewed_30d": 3, "messages_sent_30d": 1,
     "last_login": (_now - timedelta(days=5)).isoformat(),
     "avg_session_minutes": 8.7, "portal_adoption": True,
     "nps_score": 7, "satisfaction": "passive",
     "engagement_score": 62, "engagement_trend": "stable",
     "at_risk": False, "tenure_years": 6.1},
    {"id": "cl-007", "name": "James & Laura Davis", "aum": 980000,
     "advisor": "James Rodriguez", "segment": "Affluent",
     "logins_30d": 1, "documents_viewed_30d": 1, "messages_sent_30d": 0,
     "last_login": (_now - timedelta(days=18)).isoformat(),
     "avg_session_minutes": 4.2, "portal_adoption": True,
     "nps_score": 5, "satisfaction": "detractor",
     "engagement_score": 22, "engagement_trend": "declining",
     "at_risk": True, "tenure_years": 1.8},
    {"id": "cl-008", "name": "Richard Brown", "aum": 2100000,
     "advisor": "Leslie Thompson", "segment": "HNW",
     "logins_30d": 10, "documents_viewed_30d": 6, "messages_sent_30d": 4,
     "last_login": (_now - timedelta(days=2)).isoformat(),
     "avg_session_minutes": 12.3, "portal_adoption": True,
     "nps_score": 9, "satisfaction": "promoter",
     "engagement_score": 85, "engagement_trend": "stable",
     "at_risk": False, "tenure_years": 7.3},
]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/dashboard")
async def engagement_dashboard(current_user: dict = Depends(get_current_user)):
    total = len(MOCK_CLIENTS)
    at_risk = [c for c in MOCK_CLIENTS if c["at_risk"]]
    adopted = [c for c in MOCK_CLIENTS if c["portal_adoption"]]
    promoters = [c for c in MOCK_CLIENTS if c["satisfaction"] == "promoter"]
    avg_score = sum(c["engagement_score"] for c in MOCK_CLIENTS) / total

    return {
        "total_clients": total,
        "average_engagement_score": round(avg_score, 1),
        "at_risk_count": len(at_risk),
        "at_risk_aum": sum(c["aum"] for c in at_risk),
        "portal_adoption_rate": round(len(adopted) / total * 100, 1),
        "nps_score": round(sum(c.get("nps_score", 7) or 7 for c in MOCK_CLIENTS) / total, 1),
        "promoters_pct": round(len(promoters) / total * 100, 1),
        "avg_logins_30d": round(sum(c["logins_30d"] for c in MOCK_CLIENTS) / total, 1),
        "avg_session_minutes": round(sum(c["avg_session_minutes"] for c in MOCK_CLIENTS) / total, 1),
        "engagement_by_segment": {
            "HNW": round(sum(c["engagement_score"] for c in MOCK_CLIENTS if c["segment"] == "HNW") /
                        max(sum(1 for c in MOCK_CLIENTS if c["segment"] == "HNW"), 1), 1),
            "Affluent": round(sum(c["engagement_score"] for c in MOCK_CLIENTS if c["segment"] == "Affluent") /
                             max(sum(1 for c in MOCK_CLIENTS if c["segment"] == "Affluent"), 1), 1),
            "Mass Affluent": round(sum(c["engagement_score"] for c in MOCK_CLIENTS if c["segment"] == "Mass Affluent") /
                                  max(sum(1 for c in MOCK_CLIENTS if c["segment"] == "Mass Affluent"), 1), 1),
        },
        "trend_30d": [
            {"date": (_now - timedelta(days=30 - d)).strftime("%Y-%m-%d"),
             "logins": random.randint(5, 25), "documents_viewed": random.randint(2, 15),
             "messages": random.randint(0, 8)}
            for d in range(30)
        ],
    }


@router.get("/clients")
async def list_client_engagement(
    sort_by: str = "engagement_score",
    order: str = "desc",
    at_risk_only: bool = False,
    current_user: dict = Depends(get_current_user),
):
    clients = MOCK_CLIENTS
    if at_risk_only:
        clients = [c for c in clients if c["at_risk"]]
    reverse = order == "desc"
    clients = sorted(clients, key=lambda c: c.get(sort_by, 0) or 0, reverse=reverse)
    return {"clients": clients, "total": len(clients)}


@router.get("/clients/{client_id}")
async def get_client_engagement(
    client_id: str,
    current_user: dict = Depends(get_current_user),
):
    for c in MOCK_CLIENTS:
        if c["id"] == client_id:
            return {
                **c,
                "activity_timeline": [
                    {"date": (_now - timedelta(days=d)).strftime("%Y-%m-%d"),
                     "action": random.choice(["Portal Login", "Viewed Statement",
                                              "Downloaded Report", "Sent Message",
                                              "Viewed Goal Progress", "Updated Profile"]),
                     "duration_minutes": round(random.uniform(1, 25), 1)}
                    for d in range(min(c["logins_30d"], 15))
                ],
                "feature_usage": {
                    "Dashboard": random.randint(5, 20),
                    "Portfolio": random.randint(3, 15),
                    "Documents": random.randint(1, 10),
                    "Goals": random.randint(0, 8),
                    "Messages": random.randint(0, 6),
                    "Learning Center": random.randint(0, 4),
                },
            }
    return {"error": "Client not found"}


@router.get("/at-risk")
async def get_at_risk_clients(current_user: dict = Depends(get_current_user)):
    at_risk = [c for c in MOCK_CLIENTS if c["at_risk"]]
    return {
        "clients": at_risk,
        "total": len(at_risk),
        "total_aum_at_risk": sum(c["aum"] for c in at_risk),
        "recommended_actions": [
            {"client_id": c["id"], "client_name": c["name"],
             "action": "Schedule proactive check-in call" if c["logins_30d"] == 0
                       else "Send personalized market update",
             "priority": "high" if c["aum"] > 1000000 else "medium",
             "days_since_login": (datetime.fromisoformat(c["last_login"].replace("Z", "+00:00")) - _now).days * -1 if c["last_login"] else 999}
            for c in at_risk
        ],
    }
