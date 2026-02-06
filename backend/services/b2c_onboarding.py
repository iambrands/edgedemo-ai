"""
Self-service onboarding for retail investors.
1. Register (email/password)
2. Risk profile questionnaire (generates Client + suitability fields)
3. Upload first statement(s) (creates Account + Positions)
4. Dashboard ready
"""

import logging
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel

logger = logging.getLogger(__name__)

RISK_QUESTIONS = [
    {
        "id": "time_horizon",
        "question": "When do you plan to start withdrawing this money?",
        "options": [
            {"label": "Less than 3 years", "score": 1},
            {"label": "3-5 years", "score": 2},
            {"label": "5-10 years", "score": 3},
            {"label": "10-20 years", "score": 4},
            {"label": "20+ years", "score": 5},
        ],
    },
    {
        "id": "loss_tolerance",
        "question": "If your portfolio dropped 20% in one month, what would you do?",
        "options": [
            {"label": "Sell everything immediately", "score": 1},
            {"label": "Sell some to reduce risk", "score": 2},
            {"label": "Hold and wait for recovery", "score": 3},
            {"label": "Buy more at the lower prices", "score": 5},
        ],
    },
    {
        "id": "investment_objective",
        "question": "What is your primary investment goal?",
        "options": [
            {"label": "Preserve my money (minimize losses)", "score": 1},
            {"label": "Generate steady income", "score": 2},
            {"label": "Balanced growth and income", "score": 3},
            {"label": "Maximize long-term growth", "score": 4},
            {"label": "Aggressive growth (higher risk OK)", "score": 5},
        ],
    },
    {
        "id": "investment_experience",
        "question": "How would you describe your investment experience?",
        "options": [
            {"label": "None — this is my first time", "score": 1},
            {"label": "Basic — I have a 401k or savings", "score": 2},
            {"label": "Moderate — I actively manage investments", "score": 3},
            {"label": "Advanced — I trade options/futures", "score": 4},
            {"label": "Expert — professional finance background", "score": 5},
        ],
    },
]


class RiskProfileResult(BaseModel):
    risk_tolerance: str
    risk_score: int
    target_allocation: dict[str, Decimal]
    investment_objective: str
    time_horizon: str
    sophistication_level: str


class OnboardingService:
    """Process risk profile and map to Client suitability fields."""

    def process_risk_profile(self, answers: dict[str, int]) -> RiskProfileResult:
        """Score answers -> map to risk tolerance -> target allocation."""
        total_score = sum(answers.values())
        max_score = len(RISK_QUESTIONS) * 5
        risk_pct = total_score / max_score if max_score else 0

        if risk_pct < 0.3:
            risk_tolerance = "conservative"
            target_equity = Decimal("0.30")
            target_fixed = Decimal("0.60")
            target_cash = Decimal("0.10")
            sophistication = "novice"
        elif risk_pct < 0.5:
            risk_tolerance = "moderate_conservative"
            target_equity = Decimal("0.45")
            target_fixed = Decimal("0.45")
            target_cash = Decimal("0.10")
            sophistication = "intermediate"
        elif risk_pct < 0.7:
            risk_tolerance = "moderate"
            target_equity = Decimal("0.60")
            target_fixed = Decimal("0.30")
            target_cash = Decimal("0.10")
            sophistication = "intermediate"
        elif risk_pct < 0.85:
            risk_tolerance = "moderate_aggressive"
            target_equity = Decimal("0.75")
            target_fixed = Decimal("0.20")
            target_cash = Decimal("0.05")
            sophistication = "advanced"
        else:
            risk_tolerance = "aggressive"
            target_equity = Decimal("0.85")
            target_fixed = Decimal("0.10")
            target_cash = Decimal("0.05")
            sophistication = "expert"

        objective_map = {1: "preservation", 2: "income", 3: "balanced", 4: "growth", 5: "aggressive"}
        horizon_map = {1: "short", 2: "medium", 3: "medium_long", 4: "long", 5: "very_long"}

        return RiskProfileResult(
            risk_tolerance=risk_tolerance,
            risk_score=total_score,
            target_allocation={"equity": target_equity, "fixed_income": target_fixed, "cash": target_cash},
            investment_objective=objective_map.get(answers.get("investment_objective", 3), "balanced"),
            time_horizon=horizon_map.get(answers.get("time_horizon", 3), "medium_long"),
            sophistication_level=sophistication,
        )
