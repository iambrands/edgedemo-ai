"""
Dashboard summary endpoints.
"""

from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


class MetricSummary(BaseModel):
    total_aum: float
    aum_change_pct: float
    household_count: int
    new_households_week: int
    account_count: int
    pending_accounts: int
    compliance_pass_rate: float
    compliance_reviews_pending: int


class ActivityItem(BaseModel):
    id: str
    type: str
    description: str
    timestamp: datetime
    household_name: str | None = None
    link: str | None = None


class Alert(BaseModel):
    id: str
    severity: str
    title: str
    description: str
    action_link: str | None = None
    action_text: str | None = None


class MarketData(BaseModel):
    symbol: str
    name: str
    value: float
    change: float
    change_pct: float


class DashboardSummary(BaseModel):
    metrics: MetricSummary
    recent_activity: list[ActivityItem]
    alerts: list[Alert]
    market_data: list[MarketData]


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary():
    """Get dashboard summary data."""
    now = datetime.now()
    metrics = MetricSummary(
        total_aum=1247532.45,
        aum_change_pct=2.3,
        household_count=12,
        new_households_week=2,
        account_count=28,
        pending_accounts=3,
        compliance_pass_rate=94.0,
        compliance_reviews_pending=2,
    )
    recent_activity = [
        ActivityItem(
            id="act_1",
            type="statement_uploaded",
            description="NW Mutual statement uploaded and parsed",
            timestamp=now - timedelta(minutes=2),
            household_name="Wilson Family",
            link="/statements/1",
        ),
        ActivityItem(
            id="act_2",
            type="ips_generated",
            description="Investment Policy Statement generated",
            timestamp=now - timedelta(hours=1),
            household_name="Johnson Household",
            link="/planning/ips",
        ),
        ActivityItem(
            id="act_3",
            type="rebalance_executed",
            description="Portfolio rebalanced (3 trades)",
            timestamp=now - timedelta(hours=3),
            household_name="Chen Family Trust",
            link="/planning/rebalance",
        ),
        ActivityItem(
            id="act_4",
            type="household_added",
            description="New household onboarded",
            timestamp=now - timedelta(days=1),
            household_name="Martinez Family",
            link="/households/4",
        ),
    ]
    alerts = [
        Alert(
            id="alert_1",
            severity="warning",
            title="3 portfolios need rebalancing",
            description="Drift exceeds 5% threshold",
            action_link="/planning/rebalance",
            action_text="Review",
        ),
        Alert(
            id="alert_2",
            severity="warning",
            title="2 compliance reviews pending",
            description="FINRA 2330 checks require attention",
            action_link="/compliance",
            action_text="Review",
        ),
        Alert(
            id="alert_3",
            severity="info",
            title="Tax harvesting opportunity",
            description="$4,200 potential savings identified",
            action_link="/analysis/tax",
            action_text="View",
        ),
    ]
    market_data = [
        MarketData(symbol="SPY", name="S&P 500", value=5234.18, change=23.45, change_pct=0.45),
        MarketData(symbol="QQQ", name="NASDAQ", value=16789.32, change=103.21, change_pct=0.62),
        MarketData(symbol="TNX", name="10Y Treasury", value=4.32, change=-0.02, change_pct=-0.46),
        MarketData(symbol="GLD", name="Gold", value=2045.60, change=12.30, change_pct=0.60),
    ]
    return DashboardSummary(
        metrics=metrics,
        recent_activity=recent_activity,
        alerts=alerts,
        market_data=market_data,
    )


@router.get("/performance")
async def get_performance_data(period: str = "1M"):
    """Get portfolio performance data for charts."""
    import random
    from datetime import date

    periods = {"1M": 30, "3M": 90, "6M": 180, "1Y": 365, "ALL": 730}
    days = periods.get(period, 30)
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    data = []
    current_value = 1000000.0
    for i in range(days):
        current_date = start_date + timedelta(days=i)
        change = random.uniform(-0.02, 0.025)
        current_value *= 1 + change
        data.append({
            "date": current_date.isoformat(),
            "portfolio": round(current_value, 2),
            "benchmark": round(1000000 * (1 + 0.0003 * i), 2),
        })
    return {
        "period": period,
        "data": data,
        "total_return": round((current_value - 1000000) / 1000000 * 100, 2),
        "benchmark_return": round((data[-1]["benchmark"] - 1000000) / 1000000 * 100, 2),
    }
