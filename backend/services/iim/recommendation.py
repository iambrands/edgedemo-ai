"""
Actionable Recommendation data model and generation (IMM-06).

IIM outputs ActionableRecommendation objects that bridge intelligence
to executable trade actions via Tradier.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import List, Optional
from uuid import UUID, uuid4

logger = logging.getLogger(__name__)


class RecType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    REBALANCE = "REBALANCE"
    TLH = "TLH"
    HOLD_OVERRIDE = "HOLD_OVERRIDE"


class ComplianceStatus(str, Enum):
    APPROVED = "APPROVED"
    WARNING = "WARNING"
    BLOCKED = "BLOCKED"


@dataclass
class TaxImpact:
    estimated_gain_loss: float = 0.0
    tax_consequence: str = "neutral"
    estimated_tax_dollars: float = 0.0


@dataclass
class ActionableRecommendation:
    rec_id: str = ""
    advisor_id: str = ""
    client_id: str = ""
    rec_type: str = "BUY"
    symbol: str = ""
    quantity: float = 0.0
    target_weight: float = 0.0
    rationale: str = ""
    confidence: float = 0.5
    tax_impact: TaxImpact = field(default_factory=TaxImpact)
    compliance_status: str = "APPROVED"
    compliance_flags: List[str] = field(default_factory=list)
    expires_at: Optional[datetime] = None
    order_preview: dict = field(default_factory=dict)

    def __post_init__(self):
        if not self.rec_id:
            self.rec_id = str(uuid4())
        if not self.expires_at:
            now = datetime.now(timezone.utc)
            self.expires_at = now.replace(hour=16, minute=0, second=0, microsecond=0)
            if self.expires_at < now:
                self.expires_at += timedelta(days=1)

    def to_dict(self) -> dict:
        return {
            "rec_id": self.rec_id,
            "advisor_id": str(self.advisor_id),
            "client_id": str(self.client_id),
            "rec_type": self.rec_type,
            "symbol": self.symbol,
            "quantity": self.quantity,
            "target_weight": self.target_weight,
            "rationale": self.rationale,
            "confidence": self.confidence,
            "tax_impact": {
                "estimated_gain_loss": self.tax_impact.estimated_gain_loss,
                "tax_consequence": self.tax_impact.tax_consequence,
                "estimated_tax_dollars": self.tax_impact.estimated_tax_dollars,
            },
            "compliance_status": self.compliance_status,
            "compliance_flags": self.compliance_flags,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "order_preview": self.order_preview,
        }


async def get_client_recommendations(
    client_id: UUID, advisor_id: UUID, db
) -> list[dict]:
    """
    Generate actionable recommendations for a client.
    Integrates IIM analysis → CIM pre-check → BIM confidence → order preview.
    """
    from backend.services.iim.order_builder import build_order_preview

    recs = []

    try:
        from backend.services.iim_service import IIMService
        from backend.services.cim_service import CIMService, ComplianceRulesEngine
        from backend.services.bim_service import BIMService

        iim = IIMService(db)
        cim = CIMService(db)
        bim = BIMService()
        rules = ComplianceRulesEngine()

        analysis = await iim.analyze_household(str(client_id))

        if analysis.concentration_risks:
            for risk in analysis.concentration_risks[:3]:
                rec = ActionableRecommendation(
                    advisor_id=str(advisor_id),
                    client_id=str(client_id),
                    rec_type="SELL",
                    symbol=getattr(risk, "symbol", "UNKNOWN"),
                    quantity=10,
                    rationale=f"Reduce concentration: {getattr(risk, 'description', 'position too large')}",
                    confidence=0.7,
                )

                suitability = await cim.compute_suitability_score(
                    {"risk_tolerance": 3, "sophistication_level": 3, "liquidity_needs": 3},
                    {"risk_level": 3, "complexity_rating": 1, "liquidity_rating": 5},
                )
                if suitability["blocking"]:
                    rec.compliance_status = "BLOCKED"
                elif not suitability["passed"]:
                    rec.compliance_status = "WARNING"
                rec.compliance_flags = suitability.get("flags", [])

                rec.confidence = await bim.compute_recommendation_confidence(
                    rec, client_id, db
                )

                rec.order_preview = build_order_preview(rec)
                recs.append(rec.to_dict())

    except Exception as e:
        logger.warning("Recommendation generation failed: %s", e)

    return recs
