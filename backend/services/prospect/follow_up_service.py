"""
Automated follow-up service for prospect pipeline (IMM-04).

Runs periodic checks via APScheduler to send follow-up emails
and advisor alerts based on prospect stage and inactivity.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.prospect import Prospect, ProspectCommunication, ProspectStatus
from backend.services.notifications import send_advisor_alert, send_email

logger = logging.getLogger(__name__)

FOLLOW_UP_RULES = [
    {
        "stage": ProspectStatus.CONTACTED,
        "days_inactive": 3,
        "template": "follow_up_1",
        "subject": "Following up on our conversation",
        "alert_advisor": False,
    },
    {
        "stage": ProspectStatus.CONTACTED,
        "days_inactive": 7,
        "template": "follow_up_2",
        "subject": "Would love to connect",
        "alert_advisor": True,
    },
    {
        "stage": ProspectStatus.PROPOSAL_SENT,
        "days_inactive": 5,
        "template": "proposal_reminder",
        "subject": "Your investment proposal is ready",
        "alert_advisor": False,
    },
    {
        "stage": ProspectStatus.PROPOSAL_SENT,
        "days_inactive": 10,
        "template": "advisor_alert_cold",
        "subject": "Prospect going cold",
        "alert_advisor": True,
        "advisor_only": True,
    },
]


async def check_follow_ups(db: AsyncSession) -> int:
    """
    Check all prospects for follow-up needs. Returns count of actions taken.
    Called by APScheduler every hour.
    """
    actions_taken = 0
    now = datetime.now(timezone.utc)

    for rule in FOLLOW_UP_RULES:
        cutoff = now - timedelta(days=rule["days_inactive"])
        result = await db.execute(
            select(Prospect).where(
                and_(
                    Prospect.status == rule["stage"],
                    Prospect.last_activity_at < cutoff,
                    Prospect.last_activity_at.isnot(None),
                )
            )
        )
        prospects = list(result.scalars().all())

        for prospect in prospects:
            already_sent = await _already_sent(
                db, prospect.id, rule["template"], rule["days_inactive"]
            )
            if already_sent:
                continue

            if rule.get("advisor_only"):
                await send_advisor_alert(
                    str(prospect.advisor_id),
                    rule["template"],
                    f"{prospect.first_name} {prospect.last_name} — {rule['subject']}",
                )
            elif prospect.email:
                await send_email(
                    prospect.email,
                    rule["subject"],
                    _render_template(rule["template"], prospect),
                )

            if rule.get("alert_advisor"):
                await send_advisor_alert(
                    str(prospect.advisor_id),
                    "prospect_needs_attention",
                    f"{prospect.first_name} {prospect.last_name} inactive for {rule['days_inactive']}+ days",
                )

            comm = ProspectCommunication(
                prospect_id=prospect.id,
                comm_type="EMAIL" if not rule.get("advisor_only") else "NOTE",
                template_name=rule["template"],
            )
            db.add(comm)
            actions_taken += 1

    if actions_taken:
        await db.commit()
    logger.info("Follow-up check complete: %d actions taken", actions_taken)
    return actions_taken


async def _already_sent(
    db: AsyncSession, prospect_id, template: str, days_window: int
) -> bool:
    """Check if this template was already sent within the window."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_window)
    result = await db.execute(
        select(ProspectCommunication.id).where(
            and_(
                ProspectCommunication.prospect_id == prospect_id,
                ProspectCommunication.template_name == template,
                ProspectCommunication.sent_at > cutoff,
            )
        ).limit(1)
    )
    return result.scalar() is not None


def _render_template(template_name: str, prospect: Prospect) -> str:
    """Simple HTML email template rendering."""
    name = f"{prospect.first_name} {prospect.last_name}"
    templates = {
        "follow_up_1": f"""
            <p>Hi {prospect.first_name},</p>
            <p>I wanted to follow up on our recent conversation about your
            financial goals. I'd love to explore how Edge can help you build
            and protect your wealth.</p>
            <p>Would you have time for a brief call this week?</p>
        """,
        "follow_up_2": f"""
            <p>Hi {prospect.first_name},</p>
            <p>I haven't heard back yet and wanted to make sure my previous
            message didn't get lost. I'm confident we can help you achieve
            your investment objectives.</p>
            <p>Could we schedule 15 minutes to discuss?</p>
        """,
        "proposal_reminder": f"""
            <p>Hi {prospect.first_name},</p>
            <p>Your personalized investment proposal is ready for review.
            I'd love to walk you through the strategy we've designed
            specifically for your goals.</p>
            <p>Click the link below to view your proposal, or let me know
            a good time to review it together.</p>
        """,
    }
    return templates.get(template_name, f"<p>Follow-up for {name}</p>")
