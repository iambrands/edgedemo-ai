"""
Main prospect service.

CRUD operations, pipeline management, activity tracking, proposal workflow,
and pipeline analytics — all scoped to a single advisor.
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.prospect import (
    ActivityType,
    EmailTemplate,
    LeadSource,
    Proposal,
    ProposalStatus,
    Prospect,
    ProspectActivity,
    ProspectStatus,
)

from .lead_scorer import LeadScorer
from .proposal_generator import ProposalGenerator

logger = logging.getLogger(__name__)


class ProspectService:
    """Main service for prospect pipeline management."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.scorer = LeadScorer(db)
        self.proposal_generator = ProposalGenerator(db)

    # ─────────────────────────────────────────────────────────────
    # Prospect CRUD
    # ─────────────────────────────────────────────────────────────

    async def create_prospect(
        self,
        advisor_id: UUID,
        data: Dict[str, Any],
    ) -> Prospect:
        """Create a new prospect and trigger initial scoring."""
        prospect = Prospect(
            advisor_id=advisor_id,
            first_name=data["first_name"],
            last_name=data["last_name"],
            email=data.get("email"),
            phone=data.get("phone"),
            company=data.get("company"),
            title=data.get("title"),
            industry=data.get("industry"),
            linkedin_url=data.get("linkedin_url"),
            city=data.get("city"),
            state=data.get("state"),
            zip_code=data.get("zip_code"),
            lead_source=LeadSource(data.get("lead_source", "other")),
            source_detail=data.get("source_detail"),
            referred_by_client_id=data.get("referred_by_client_id"),
            estimated_aum=(
                Decimal(str(data["estimated_aum"]))
                if data.get("estimated_aum")
                else None
            ),
            annual_income=(
                Decimal(str(data["annual_income"]))
                if data.get("annual_income")
                else None
            ),
            risk_tolerance=data.get("risk_tolerance"),
            investment_goals=data.get("investment_goals", []),
            time_horizon=data.get("time_horizon"),
            interested_services=data.get("interested_services", []),
            notes=data.get("notes"),
            tags=data.get("tags", []),
            status=ProspectStatus.NEW,
            stage_entered_at=datetime.utcnow(),
        )

        self.db.add(prospect)
        await self.db.commit()
        await self.db.refresh(prospect)

        # Initial scoring
        await self.scorer.score_prospect(prospect.id)

        return prospect

    async def update_prospect(
        self,
        prospect_id: UUID,
        data: Dict[str, Any],
    ) -> Prospect:
        """Update prospect fields.  Tracks status transitions."""
        prospect = await self.get_prospect(prospect_id)
        if not prospect:
            raise ValueError("Prospect not found")

        old_status = prospect.status

        for key, value in data.items():
            if not hasattr(prospect, key):
                continue
            if key == "status" and value:
                value = ProspectStatus(value)
            elif key == "lead_source" and value:
                value = LeadSource(value)
            elif key in ("estimated_aum", "annual_income", "net_worth") and value is not None:
                value = Decimal(str(value))
            setattr(prospect, key, value)

        # Handle status transitions
        if "status" in data and ProspectStatus(data["status"]) != old_status:
            prospect.stage_entered_at = datetime.utcnow()
            prospect.days_in_stage = 0

            activity = ProspectActivity(
                prospect_id=prospect_id,
                advisor_id=prospect.advisor_id,
                activity_type=ActivityType.NOTE,
                subject=f"Status changed to {data['status']}",
                status_before=old_status.value,
                status_after=data["status"],
                is_automated=True,
            )
            self.db.add(activity)

        await self.db.commit()

        # Re-score
        await self.scorer.score_prospect(prospect_id)

        return prospect

    async def get_prospect(
        self, prospect_id: UUID
    ) -> Optional[Prospect]:
        """Get a single prospect with activities and proposals."""
        result = await self.db.execute(
            select(Prospect)
            .options(
                selectinload(Prospect.activities),
                selectinload(Prospect.proposals),
            )
            .where(Prospect.id == prospect_id)
        )
        return result.scalar_one_or_none()

    async def list_prospects(
        self,
        advisor_id: UUID,
        status: Optional[ProspectStatus] = None,
        lead_source: Optional[LeadSource] = None,
        min_score: Optional[int] = None,
        search: Optional[str] = None,
        tags: Optional[List[str]] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[Prospect], int]:
        """List prospects with filtering and pagination."""
        query = select(Prospect).where(Prospect.advisor_id == advisor_id)

        if status:
            query = query.where(Prospect.status == status)
        if lead_source:
            query = query.where(Prospect.lead_source == lead_source)
        if min_score is not None:
            query = query.where(Prospect.lead_score >= min_score)
        if tags:
            query = query.where(Prospect.tags.overlap(tags))
        if search:
            query = query.where(
                Prospect.search_vector.match(
                    search, postgresql_regconfig="english"
                )
            )

        # Total count
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        # Paginate
        query = query.order_by(
            Prospect.lead_score.desc(), Prospect.created_at.desc()
        )
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        return result.scalars().all(), total

    async def delete_prospect(self, prospect_id: UUID) -> bool:
        """Delete a prospect and all related records."""
        prospect = await self.get_prospect(prospect_id)
        if not prospect:
            return False
        await self.db.delete(prospect)
        await self.db.commit()
        return True

    # ─────────────────────────────────────────────────────────────
    # Pipeline Analytics
    # ─────────────────────────────────────────────────────────────

    async def get_pipeline_summary(
        self, advisor_id: UUID
    ) -> Dict[str, Any]:
        """Get pipeline funnel summary grouped by stage."""
        result = await self.db.execute(
            select(
                Prospect.status,
                func.count(Prospect.id),
                func.sum(Prospect.estimated_aum),
            )
            .where(Prospect.advisor_id == advisor_id)
            .group_by(Prospect.status)
        )

        stages: Dict[str, Dict] = {}
        total_prospects = 0
        total_pipeline_value = Decimal("0")

        for status, count, aum in result.all():
            stages[status.value] = {
                "count": count,
                "value": float(aum or 0),
            }
            total_prospects += count
            if aum:
                total_pipeline_value += aum

        return {
            "stages": stages,
            "total_prospects": total_prospects,
            "total_pipeline_value": float(total_pipeline_value),
        }

    async def get_conversion_metrics(
        self,
        advisor_id: UUID,
        days: int = 90,
    ) -> Dict[str, Any]:
        """Get conversion rate metrics for a given period."""
        since = datetime.utcnow() - timedelta(days=days)

        total_created = (
            await self.db.execute(
                select(func.count(Prospect.id)).where(
                    and_(
                        Prospect.advisor_id == advisor_id,
                        Prospect.created_at >= since,
                    )
                )
            )
        ).scalar() or 0

        won = (
            await self.db.execute(
                select(func.count(Prospect.id)).where(
                    and_(
                        Prospect.advisor_id == advisor_id,
                        Prospect.status == ProspectStatus.WON,
                        Prospect.converted_at >= since,
                    )
                )
            )
        ).scalar() or 0

        lost = (
            await self.db.execute(
                select(func.count(Prospect.id)).where(
                    and_(
                        Prospect.advisor_id == advisor_id,
                        Prospect.status == ProspectStatus.LOST,
                        Prospect.updated_at >= since,
                    )
                )
            )
        ).scalar() or 0

        conversion_rate = (
            (won / total_created * 100) if total_created > 0 else 0
        )

        return {
            "period_days": days,
            "total_created": total_created,
            "won": won,
            "lost": lost,
            "conversion_rate": round(conversion_rate, 2),
            "in_progress": total_created - won - lost,
        }

    # ─────────────────────────────────────────────────────────────
    # Activities
    # ─────────────────────────────────────────────────────────────

    async def log_activity(
        self,
        prospect_id: UUID,
        advisor_id: UUID,
        activity_type: ActivityType,
        data: Dict[str, Any],
    ) -> ProspectActivity:
        """Log an interaction and re-score the prospect."""
        activity = ProspectActivity(
            prospect_id=prospect_id,
            advisor_id=advisor_id,
            activity_type=activity_type,
            subject=data.get("subject"),
            description=data.get("description"),
            activity_date=data.get("activity_date", datetime.utcnow()),
            duration_minutes=data.get("duration_minutes"),
            call_outcome=data.get("call_outcome"),
            call_direction=data.get("call_direction"),
            email_status=data.get("email_status"),
            meeting_outcome=data.get("meeting_outcome"),
            task_due_date=data.get("task_due_date"),
        )

        self.db.add(activity)
        await self.db.commit()

        # Re-score after activity
        await self.scorer.score_prospect(prospect_id)

        return activity

    async def get_activities(
        self,
        prospect_id: UUID,
        activity_type: Optional[ActivityType] = None,
        limit: int = 50,
    ) -> List[ProspectActivity]:
        """Get activities for a prospect."""
        query = select(ProspectActivity).where(
            ProspectActivity.prospect_id == prospect_id
        )
        if activity_type:
            query = query.where(
                ProspectActivity.activity_type == activity_type
            )
        query = query.order_by(
            ProspectActivity.activity_date.desc()
        ).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_pending_tasks(
        self, advisor_id: UUID
    ) -> List[ProspectActivity]:
        """Get incomplete tasks across all prospects for an advisor."""
        result = await self.db.execute(
            select(ProspectActivity)
            .join(Prospect)
            .where(
                and_(
                    Prospect.advisor_id == advisor_id,
                    ProspectActivity.activity_type == ActivityType.TASK,
                    ProspectActivity.task_completed.is_(False),
                )
            )
            .order_by(ProspectActivity.task_due_date.asc())
        )
        return result.scalars().all()

    # ─────────────────────────────────────────────────────────────
    # Proposals
    # ─────────────────────────────────────────────────────────────

    async def generate_proposal(
        self,
        prospect_id: UUID,
        advisor_id: UUID,
        custom_params: Optional[Dict[str, Any]] = None,
    ) -> Proposal:
        """Generate an AI proposal for a prospect."""
        return await self.proposal_generator.generate_proposal(
            prospect_id, advisor_id, custom_params
        )

    async def get_proposals(
        self,
        prospect_id: Optional[UUID] = None,
        advisor_id: Optional[UUID] = None,
        status: Optional[ProposalStatus] = None,
    ) -> List[Proposal]:
        """Get proposals with optional filters."""
        query = select(Proposal)
        if prospect_id:
            query = query.where(Proposal.prospect_id == prospect_id)
        if advisor_id:
            query = query.where(Proposal.advisor_id == advisor_id)
        if status:
            query = query.where(Proposal.status == status)

        query = query.order_by(Proposal.created_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_proposal_status(
        self,
        proposal_id: UUID,
        status: ProposalStatus,
        notes: Optional[str] = None,
    ) -> Proposal:
        """Update proposal status and handle side-effects."""
        result = await self.db.execute(
            select(Proposal).where(Proposal.id == proposal_id)
        )
        proposal = result.scalar_one_or_none()
        if not proposal:
            raise ValueError("Proposal not found")

        proposal.status = status

        if status == ProposalStatus.SENT:
            proposal.sent_at = datetime.utcnow()
        elif status == ProposalStatus.VIEWED:
            proposal.viewed_at = datetime.utcnow()
            proposal.view_count += 1
        elif status in (ProposalStatus.ACCEPTED, ProposalStatus.REJECTED):
            proposal.responded_at = datetime.utcnow()
            proposal.response_notes = notes

            if status == ProposalStatus.ACCEPTED:
                await self.update_prospect(
                    proposal.prospect_id, {"status": "won"}
                )

        await self.db.commit()
        return proposal

    # ─────────────────────────────────────────────────────────────
    # Conversion
    # ─────────────────────────────────────────────────────────────

    async def convert_to_client(
        self,
        prospect_id: UUID,
        client_id: UUID,
    ) -> Prospect:
        """Mark a prospect as converted to a client."""
        prospect = await self.get_prospect(prospect_id)
        if not prospect:
            raise ValueError("Prospect not found")

        prospect.status = ProspectStatus.WON
        prospect.converted_at = datetime.utcnow()
        prospect.converted_client_id = client_id

        await self.db.commit()
        return prospect

    async def mark_lost(
        self,
        prospect_id: UUID,
        reason: str,
        lost_to: Optional[str] = None,
    ) -> Prospect:
        """Mark a prospect as lost."""
        prospect = await self.get_prospect(prospect_id)
        if not prospect:
            raise ValueError("Prospect not found")

        prospect.status = ProspectStatus.LOST
        prospect.lost_reason = reason
        prospect.lost_to_competitor = lost_to

        await self.db.commit()
        return prospect
