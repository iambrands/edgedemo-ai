"""AI Orchestrator — coordinates IIM → CIM → BIM pipeline."""

import logging
import time
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from .bim_service import BIMService
from .cim_service import CIMService
from .iim_service import IIMService
from .schemas import BIMResponse, CIMResponse, HouseholdAnalysis

logger = logging.getLogger(__name__)


class OrchestratorResponse:
    """Final response from the pipeline."""

    def __init__(
        self,
        success: bool,
        message: str,
        iim_output: Optional[HouseholdAnalysis] = None,
        cim_output: Optional[CIMResponse] = None,
        bim_output: Optional[BIMResponse] = None,
        audit_trail: Optional[dict] = None,
        error: Optional[str] = None,
        latency_ms: int = 0,
    ):
        self.success = success
        self.message = message
        self.iim_output = iim_output
        self.cim_output = cim_output
        self.bim_output = bim_output
        self.audit_trail = audit_trail or {}
        self.error = error
        self.latency_ms = latency_ms


class AIOrchestrator:
    """Coordinates IIM → CIM → BIM. Logs to ComplianceLog. Target <2s latency."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.iim = IIMService(session)
        self.cim = CIMService(session)
        self.bim = BIMService()

    async def process_query(
        self,
        client_id: str,
        query: str,
        behavioral_profile: str = "balanced",
        household_id: str | None = None,
    ) -> OrchestratorResponse:
        """Run full pipeline: IIM analyze → CIM validate → BIM message."""
        start = time.perf_counter()
        hh_id = household_id or client_id
        try:
            iim_result = await self.iim.analyze_household(hh_id)
            recommendation = {
                "id": f"hh-{client_id}",
                "risk_score": 100 - min(50, len(iim_result.concentration_risks) * 10),
            }
            cim_result = await self.cim.validate_recommendation(
                recommendation=recommendation,
                client_id=client_id,
                alternatives=[{"desc": "Maintain current allocation"}],
                portfolio={"max_single_position_pct": 20},
            )
            if cim_result.status == "REJECTED":
                msg = self.bim.generate_rejection_message(
                    behavioral_profile, cim_result
                )
                bim_result = BIMResponse(
                    message=msg,
                    tone="CAUTIONARY",
                    key_points=[],
                )
                return OrchestratorResponse(
                    success=False,
                    message=msg,
                    iim_output=iim_result,
                    cim_output=cim_result,
                    bim_output=bim_result,
                    audit_trail=cim_result.audit_trail,
                    latency_ms=int((time.perf_counter() - start) * 1000),
                )
            bim_input = {
                "message": iim_result.summary,
                "key_points": [f"Total AUM: ${iim_result.total_aum:,.2f}"],
                "call_to_action": "Review allocation with your advisor.",
            }
            bim_result = self.bim.generate_message(
                bim_input, behavioral_profile=behavioral_profile
            )
            return OrchestratorResponse(
                success=True,
                message=bim_result.message,
                iim_output=iim_result,
                cim_output=cim_result,
                bim_output=bim_result,
                audit_trail=cim_result.audit_trail,
                latency_ms=int((time.perf_counter() - start) * 1000),
            )
        except Exception as e:
            logger.exception("Orchestrator error: %s", e)
            return OrchestratorResponse(
                success=False,
                message="We encountered an issue. Please try again later.",
                error=str(e),
                latency_ms=int((time.perf_counter() - start) * 1000),
            )
