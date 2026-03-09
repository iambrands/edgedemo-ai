"""ADV Part 2B currency monitoring (IMM-03)."""

import logging
from datetime import datetime, timezone
from uuid import UUID

from backend.services.cim_service import ComplianceRulesEngine

logger = logging.getLogger(__name__)


async def check_adv_on_login(advisor_id: UUID, db) -> dict:
    """Called on advisor login — checks if ADV Part 2B needs updating."""
    try:
        from sqlalchemy import text

        result = await db.execute(
            text("""
                SELECT updated_at FROM compliance_documents
                WHERE advisor_id = :aid AND doc_type = 'adv_part_2b'
                ORDER BY updated_at DESC LIMIT 1
            """),
            {"aid": str(advisor_id)},
        )
        row = result.fetchone()
        if not row:
            return {"status": "no_adv_found", "severity": "WARNING"}

        days_since = (datetime.now(timezone.utc) - row[0].replace(tzinfo=timezone.utc)).days
        engine = ComplianceRulesEngine()
        rule_result = engine.check_adv_currency({"days_since_update": days_since})

        if not rule_result.passed:
            logger.warning("ADV currency check failed for advisor %s: %s", advisor_id, rule_result.details)

        return {
            "status": "checked",
            "days_since_update": days_since,
            "passed": rule_result.passed,
            "severity": rule_result.severity,
        }
    except Exception as e:
        logger.debug("ADV check skipped (no compliance_documents table): %s", e)
        return {"status": "skipped"}


async def check_all_adv_currency(db) -> int:
    """Scheduled daily job — checks all advisors. Returns count of warnings."""
    warnings = 0
    try:
        from sqlalchemy import text

        result = await db.execute(
            text("SELECT DISTINCT advisor_id FROM compliance_documents WHERE doc_type = 'adv_part_2b'")
        )
        for row in result.fetchall():
            status = await check_adv_on_login(row[0], db)
            if status.get("severity") in ("WARNING", "BLOCKING"):
                warnings += 1
    except Exception as e:
        logger.debug("ADV batch check skipped: %s", e)
    return warnings
