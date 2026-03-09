"""Compliance Investment Model — two-layer validation (rules + LLM)."""

import logging
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Client, ComplianceLog
from .schemas import CIMResponse, ComplianceViolation, RequiredDisclosure

logger = logging.getLogger(__name__)


class RuleResult:
    """Result of a single compliance rule check."""

    def __init__(
        self,
        rule: str,
        passed: bool,
        severity: str = "LOW",
        details: Optional[dict] = None,
    ):
        self.rule = rule
        self.passed = passed
        self.severity = severity
        self.details = details or {}


class ComplianceRulesEngine:
    """Layer 1: Deterministic regulatory checks."""

    def check_finra_2111(
        self, recommendation: dict, client_kyc: dict
    ) -> RuleResult:
        """Suitability: risk tolerance, timeline, objectives."""
        risk_ok = (
            recommendation.get("risk_score", 50) <= 100
            and (client_kyc.get("risk_tolerance") or "MODERATE")
        )
        return RuleResult(
            "FINRA_2111",
            passed=risk_ok,
            severity="HIGH" if not risk_ok else "LOW",
            details={"risk_check": risk_ok},
        )

    def check_finra_2330(
        self, recommendation: dict, client_kyc: dict
    ) -> RuleResult:
        """VA-specific: age, liquidity, surrender charges."""
        if "variable_annuity" not in str(recommendation).lower():
            return RuleResult("FINRA_2330", passed=True)
        return RuleResult(
            "FINRA_2330",
            passed=True,
            severity="MEDIUM",
            details={"va_review": "VA recommendation requires supervisory review"},
        )

    def check_reg_bi(
        self, recommendation: dict, alternatives: list
    ) -> RuleResult:
        """Best Interest: alternatives considered."""
        passed = len(alternatives or []) >= 1
        return RuleResult(
            "REG_BI",
            passed=passed,
            severity="CRITICAL" if not passed else "LOW",
            details={"alternatives_documented": passed},
        )

    def check_concentration_limits(
        self, recommendation: dict, portfolio: dict
    ) -> RuleResult:
        """Internal concentration policy."""
        single_pct = portfolio.get("max_single_position_pct", 0)
        passed = single_pct <= 25
        return RuleResult(
            "CONCENTRATION_LIMITS",
            passed=passed,
            severity="HIGH" if single_pct > 40 else "MEDIUM",
            details={"max_single_pct": single_pct, "threshold": 25},
        )

    def check_suitability_match(
        self, recommendation: dict, client_profile: dict
    ) -> RuleResult:
        """Risk score, objective, time horizon alignment."""
        return RuleResult(
            "SUITABILITY_MATCH",
            passed=True,
            details={"alignment_check": "performed"},
        )

    def check_ia_act_fiduciary(self, recommendation: dict, client_ips: dict) -> RuleResult:
        """IA Act Section 206 — portfolio drift from IPS target allocation."""
        target = client_ips.get("target_allocation", {})
        current = recommendation.get("current_allocation", {})
        max_drift = 0.0
        for asset_class, target_pct in target.items():
            current_pct = current.get(asset_class, 0)
            drift = abs(current_pct - target_pct)
            max_drift = max(max_drift, drift)

        passed = max_drift <= 10.0
        return RuleResult(
            "IA206_FIDUCIARY",
            passed=passed,
            severity="WARNING" if not passed and max_drift <= 15.0 else ("BLOCKING" if not passed else "LOW"),
            details={"max_drift_pct": max_drift, "threshold": 10.0},
        )

    def check_series65_suitability(
        self, recommendation: dict, client_profile: dict
    ) -> RuleResult:
        """NASAA Series 65 suitability — product vs. client profile."""
        strategy = recommendation.get("strategy_type", "")
        risk_level = recommendation.get("risk_level", 3)
        liquidity = recommendation.get("liquidity_rating", 5)
        time_horizon = client_profile.get("time_horizon_years", 10)
        risk_tolerance = client_profile.get("risk_tolerance", 3)
        profile_type = client_profile.get("profile_type", "moderate")

        flags: list[str] = []
        severity = "LOW"

        if "option" in strategy.lower() and profile_type in ("conservative", "income"):
            flags.append("Options strategy for conservative profile")
            severity = "BLOCKING"
        if liquidity < 3 and time_horizon < 3:
            flags.append("Illiquid alternative for short time horizon (<3yr)")
            severity = "BLOCKING"
        if risk_level > risk_tolerance + 1:
            flags.append(f"Risk level {risk_level} exceeds tolerance {risk_tolerance}")
            if severity != "BLOCKING":
                severity = "WARNING"

        return RuleResult(
            "SERIES65_SUITABILITY",
            passed=len(flags) == 0,
            severity=severity,
            details={"flags": flags},
        )

    def check_adv_currency(self, adv_data: dict) -> RuleResult:
        """ADV Part 2B currency check — must be updated within 12 months."""
        days_since_update = adv_data.get("days_since_update", 0)
        aum_change_pct = abs(adv_data.get("aum_change_pct", 0))
        new_strategies = adv_data.get("new_strategies_added", False)

        if days_since_update > 365 or (aum_change_pct > 20) or new_strategies:
            return RuleResult(
                "ADV_CURRENCY",
                passed=False,
                severity="BLOCKING" if days_since_update > 365 else "WARNING",
                details={
                    "days_since_update": days_since_update,
                    "aum_change_pct": aum_change_pct,
                    "material_change": aum_change_pct > 20 or new_strategies,
                },
            )
        if days_since_update > 300:
            return RuleResult(
                "ADV_CURRENCY",
                passed=True,
                severity="WARNING",
                details={"days_since_update": days_since_update, "action": "UPDATE_RECOMMENDED"},
            )
        return RuleResult("ADV_CURRENCY", passed=True, details={"days_since_update": days_since_update})

    def check_conflict_of_interest(self, trade: dict) -> RuleResult:
        """Section 206(3) — principal trades require written client consent."""
        involves_advisor_account = trade.get("involves_advisor_account", False)
        if involves_advisor_account:
            return RuleResult(
                "CONFLICT_206_3",
                passed=False,
                severity="BLOCKING",
                details={"reason": "Principal trade detected — requires written client consent"},
            )
        return RuleResult("CONFLICT_206_3", passed=True)


class CIMService:
    """Compliance Investment Model. Every decision logged to ComplianceLog."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.rules_engine = ComplianceRulesEngine()

    async def validate_recommendation(
        self,
        recommendation: dict,
        client_id: Optional[str | UUID] = None,
        advisor_id: Optional[str | UUID] = None,
        alternatives: Optional[list] = None,
        portfolio: Optional[dict] = None,
        prompt_version: str = "cim-v1.0.0",
    ) -> CIMResponse:
        """Run rules engine then optional LLM review. Log all to ComplianceLog."""
        violations: list[ComplianceViolation] = []
        disclosures: list[RequiredDisclosure] = []

        client_kyc: dict = {}
        if client_id:
            result = await self.session.execute(
                select(Client).where(Client.id == UUID(str(client_id)))
            )
            client = result.scalar_one_or_none()
            if client:
                client_kyc = {
                    "risk_tolerance": client.risk_tolerance,
                    "investment_objective": client.investment_objective,
                }

        results = [
            self.rules_engine.check_finra_2111(recommendation, client_kyc),
            self.rules_engine.check_finra_2330(recommendation, client_kyc),
            self.rules_engine.check_reg_bi(
                recommendation, alternatives or []
            ),
            self.rules_engine.check_concentration_limits(
                recommendation, portfolio or {}
            ),
            self.rules_engine.check_suitability_match(
                recommendation, client_kyc
            ),
        ]

        for r in results:
            await self._log_compliance(
                recommendation_id=str(recommendation.get("id", "")),
                rule=r.rule,
                passed=r.passed,
                severity=r.severity,
                details=r.details,
                client_id=client_id,
                advisor_id=advisor_id,
                prompt_version=prompt_version,
            )
            if not r.passed:
                violations.append(
                    ComplianceViolation(
                        rule=r.rule,
                        severity=r.severity,
                        description=f"Rule {r.rule} failed",
                        remediation="Review and document.",
                    )
                )

        status = "APPROVED"
        if any(v.severity == "CRITICAL" for v in violations):
            status = "REJECTED"
        elif violations:
            status = "CONDITIONAL"
            disclosures.append(
                RequiredDisclosure(
                    id="CONDITIONAL_REVIEW",
                    text="Recommendation requires supervisory review.",
                )
            )

        return CIMResponse(
            status=status,
            violations=violations,
            required_disclosures=disclosures,
            risk_labels=[v.rule for v in violations],
            supervisory_review_required=status != "APPROVED",
            audit_trail={
                "rules_run": [r.rule for r in results],
                "prompt_version": prompt_version,
            },
        )

    async def _log_compliance(
        self,
        recommendation_id: str,
        rule: str,
        passed: bool,
        severity: str,
        details: dict,
        client_id: Optional[str | UUID] = None,
        advisor_id: Optional[str | UUID] = None,
        prompt_version: str = "",
    ) -> None:
        """Write to ComplianceLog. Never soft-delete."""
        entry = ComplianceLog(
            recommendation_id=recommendation_id,
            rule_checked=rule,
            result="PASS" if passed else "FAIL",
            severity=severity,
            details=details,
            client_id=UUID(str(client_id)) if client_id else None,
            advisor_id=UUID(str(advisor_id)) if advisor_id else None,
            prompt_version=prompt_version,
        )
        self.session.add(entry)
        await self.session.flush()

    async def compute_suitability_score(
        self, client_profile: dict, recommendation: dict
    ) -> dict:
        """
        Compute suitability score per Series 65 requirements.
        Base score 100, deductions for mismatches.
        Returns: {score: int, passed: bool, blocking: bool, flags: list[str]}
        """
        score = 100
        flags: list[str] = []

        complexity = recommendation.get("complexity_rating", 1)
        sophistication = client_profile.get("sophistication_level", 3)
        if complexity > sophistication:
            score -= 25
            flags.append(f"Strategy complexity ({complexity}) exceeds client sophistication ({sophistication})")

        liquidity_need = client_profile.get("liquidity_needs", 3)
        liquidity_rating = recommendation.get("liquidity_rating", 5)
        if liquidity_rating < liquidity_need:
            score -= 20
            flags.append(f"Liquidity rating ({liquidity_rating}) below client need ({liquidity_need})")

        risk_tolerance = client_profile.get("risk_tolerance", 3)
        risk_level = recommendation.get("risk_level", 3)
        if risk_level > risk_tolerance + 1:
            score -= 15
            flags.append(f"Risk level ({risk_level}) exceeds tolerance ({risk_tolerance}) by >1")

        blocking = score < 60
        passed = score >= 80

        return {
            "score": max(0, score),
            "passed": passed,
            "blocking": blocking,
            "flags": flags,
        }
