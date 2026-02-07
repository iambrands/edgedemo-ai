"""Add prospect pipeline tables

Revision ID: 009
Revises: 008
Create Date: 2025-02-05
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Create ENUM types
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE TYPE prospectstatus AS ENUM (
            'new', 'contacted', 'qualified', 'meeting_scheduled',
            'meeting_completed', 'proposal_sent', 'negotiating',
            'won', 'lost', 'nurturing'
        )
        """
    )
    op.execute(
        """
        CREATE TYPE leadsource AS ENUM (
            'website', 'referral', 'linkedin', 'seminar',
            'cold_outreach', 'advertising', 'partnership',
            'existing_client', 'other'
        )
        """
    )
    op.execute(
        """
        CREATE TYPE activitytype AS ENUM (
            'call', 'email', 'meeting', 'video_call', 'text',
            'linkedin_message', 'voicemail', 'note', 'task',
            'proposal', 'document_sent', 'document_signed'
        )
        """
    )
    op.execute(
        """
        CREATE TYPE proposalstatus AS ENUM (
            'draft', 'review', 'sent', 'viewed',
            'accepted', 'rejected', 'expired', 'revised'
        )
        """
    )

    # ------------------------------------------------------------------
    # 2. prospects
    # ------------------------------------------------------------------
    op.create_table(
        "prospects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "advisor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("advisors.id"),
            nullable=False,
        ),
        # Basic info
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255)),
        sa.Column("phone", sa.String(50)),
        sa.Column("phone_secondary", sa.String(50)),
        # Professional
        sa.Column("company", sa.String(255)),
        sa.Column("title", sa.String(255)),
        sa.Column("industry", sa.String(100)),
        sa.Column("linkedin_url", sa.String(500)),
        # Location
        sa.Column("address_line1", sa.String(255)),
        sa.Column("address_line2", sa.String(255)),
        sa.Column("city", sa.String(100)),
        sa.Column("state", sa.String(50)),
        sa.Column("zip_code", sa.String(20)),
        sa.Column("country", sa.String(50), server_default="USA"),
        # Pipeline
        sa.Column(
            "status",
            sa.Enum(
                "new",
                "contacted",
                "qualified",
                "meeting_scheduled",
                "meeting_completed",
                "proposal_sent",
                "negotiating",
                "won",
                "lost",
                "nurturing",
                name="prospectstatus",
            ),
            server_default="new",
        ),
        sa.Column(
            "lead_source",
            sa.Enum(
                "website",
                "referral",
                "linkedin",
                "seminar",
                "cold_outreach",
                "advertising",
                "partnership",
                "existing_client",
                "other",
                name="leadsource",
            ),
            server_default="other",
        ),
        sa.Column("source_detail", sa.String(255)),
        # Referrals
        sa.Column(
            "referred_by_client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id"),
        ),
        sa.Column(
            "referred_by_prospect_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("prospects.id"),
        ),
        # Financial profile
        sa.Column("estimated_aum", sa.Numeric(18, 2)),
        sa.Column("annual_income", sa.Numeric(18, 2)),
        sa.Column("net_worth", sa.Numeric(18, 2)),
        sa.Column("current_advisor", sa.String(255)),
        sa.Column("investment_experience", sa.String(50)),
        # Investment preferences
        sa.Column("risk_tolerance", sa.String(50)),
        sa.Column("investment_goals", postgresql.ARRAY(sa.String)),
        sa.Column("time_horizon", sa.String(50)),
        sa.Column("interested_services", postgresql.ARRAY(sa.String)),
        # Lead scoring
        sa.Column("lead_score", sa.Integer, server_default="0"),
        sa.Column("fit_score", sa.Integer, server_default="0"),
        sa.Column("intent_score", sa.Integer, server_default="0"),
        sa.Column("engagement_score", sa.Integer, server_default="0"),
        sa.Column("score_factors", postgresql.JSONB),
        sa.Column("last_scored_at", sa.DateTime(timezone=True)),
        # Pipeline tracking
        sa.Column(
            "stage_entered_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("days_in_stage", sa.Integer, server_default="0"),
        sa.Column("total_days_in_pipeline", sa.Integer, server_default="0"),
        # Next action
        sa.Column("next_action_date", sa.Date),
        sa.Column("next_action_type", sa.String(50)),
        sa.Column("next_action_notes", sa.Text),
        # Assignment
        sa.Column("assigned_to", postgresql.UUID(as_uuid=True)),
        # Conversion
        sa.Column("converted_at", sa.DateTime(timezone=True)),
        sa.Column(
            "converted_client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id"),
        ),
        sa.Column("lost_reason", sa.String(255)),
        sa.Column("lost_to_competitor", sa.String(255)),
        # Notes & tags
        sa.Column("notes", sa.Text),
        sa.Column("tags", postgresql.ARRAY(sa.String)),
        # Full-text search
        sa.Column("search_vector", postgresql.TSVECTOR),
        # Custom fields + AI
        sa.Column("custom_fields", postgresql.JSONB),
        sa.Column("ai_summary", sa.Text),
        sa.Column("ai_recommendations", postgresql.JSONB),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    op.create_index("ix_prospects_advisor", "prospects", ["advisor_id"])
    op.create_index("ix_prospects_status", "prospects", ["status"])
    op.create_index("ix_prospects_score", "prospects", ["lead_score"])
    op.create_index("ix_prospects_email", "prospects", ["email"])
    op.create_index("ix_prospects_created", "prospects", ["created_at"])
    op.create_index("ix_prospects_next_action", "prospects", ["next_action_date"])
    op.create_index(
        "ix_prospects_search",
        "prospects",
        ["search_vector"],
        postgresql_using="gin",
    )

    # ------------------------------------------------------------------
    # 3. prospect_activities
    # ------------------------------------------------------------------
    op.create_table(
        "prospect_activities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "prospect_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("prospects.id"),
            nullable=False,
        ),
        sa.Column(
            "advisor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("advisors.id"),
            nullable=False,
        ),
        sa.Column(
            "activity_type",
            sa.Enum(
                "call",
                "email",
                "meeting",
                "video_call",
                "text",
                "linkedin_message",
                "voicemail",
                "note",
                "task",
                "proposal",
                "document_sent",
                "document_signed",
                name="activitytype",
            ),
            nullable=False,
        ),
        sa.Column("subject", sa.String(500)),
        sa.Column("description", sa.Text),
        sa.Column(
            "activity_date",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("duration_minutes", sa.Integer),
        # Call fields
        sa.Column("call_outcome", sa.String(50)),
        sa.Column("call_direction", sa.String(20)),
        # Email fields
        sa.Column("email_status", sa.String(50)),
        sa.Column("email_template_id", postgresql.UUID(as_uuid=True)),
        # Meeting fields
        sa.Column(
            "meeting_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("meetings.id"),
        ),
        sa.Column("meeting_outcome", sa.String(50)),
        # Task fields
        sa.Column("task_due_date", sa.Date),
        sa.Column("task_completed", sa.Boolean, server_default="false"),
        sa.Column("task_completed_at", sa.DateTime(timezone=True)),
        # Status change tracking
        sa.Column("status_before", sa.String(50)),
        sa.Column("status_after", sa.String(50)),
        # Metadata
        sa.Column("is_automated", sa.Boolean, server_default="false"),
        sa.Column("automation_trigger", sa.String(100)),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    op.create_index(
        "ix_prospect_activities_prospect",
        "prospect_activities",
        ["prospect_id"],
    )
    op.create_index(
        "ix_prospect_activities_type",
        "prospect_activities",
        ["activity_type"],
    )
    op.create_index(
        "ix_prospect_activities_date",
        "prospect_activities",
        ["activity_date"],
    )
    op.create_index(
        "ix_prospect_activities_advisor",
        "prospect_activities",
        ["advisor_id"],
    )

    # ------------------------------------------------------------------
    # 4. proposals
    # ------------------------------------------------------------------
    op.create_table(
        "proposals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "prospect_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("prospects.id"),
            nullable=False,
        ),
        sa.Column(
            "advisor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("advisors.id"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("proposal_number", sa.String(50), unique=True),
        sa.Column("version", sa.Integer, server_default="1"),
        sa.Column(
            "status",
            sa.Enum(
                "draft",
                "review",
                "sent",
                "viewed",
                "accepted",
                "rejected",
                "expired",
                "revised",
                name="proposalstatus",
            ),
            server_default="draft",
        ),
        # Content
        sa.Column("executive_summary", sa.Text),
        sa.Column("investment_philosophy", sa.Text),
        sa.Column("proposed_strategy", sa.Text),
        sa.Column("fee_structure", sa.Text),
        # Financial projections
        sa.Column("proposed_aum", sa.Numeric(18, 2)),
        sa.Column("proposed_fee_percent", sa.Numeric(5, 4)),
        sa.Column("estimated_annual_fee", sa.Numeric(18, 2)),
        # Model recommendation
        sa.Column("recommended_models", postgresql.JSONB),
        # Risk
        sa.Column("risk_profile", sa.String(50)),
        sa.Column("risk_assessment", sa.Text),
        # Document
        sa.Column("document_url", sa.String(500)),
        sa.Column("document_format", sa.String(20), server_default="pdf"),
        # Tracking
        sa.Column("sent_at", sa.DateTime(timezone=True)),
        sa.Column("sent_via", sa.String(50)),
        sa.Column("viewed_at", sa.DateTime(timezone=True)),
        sa.Column("view_count", sa.Integer, server_default="0"),
        sa.Column(
            "time_spent_viewing_seconds", sa.Integer, server_default="0"
        ),
        # Response
        sa.Column("responded_at", sa.DateTime(timezone=True)),
        sa.Column("response_notes", sa.Text),
        # Expiration
        sa.Column("valid_until", sa.Date),
        # AI generation
        sa.Column("is_ai_generated", sa.Boolean, server_default="false"),
        sa.Column("ai_generation_params", postgresql.JSONB),
        sa.Column("ai_confidence_score", sa.Numeric(5, 4)),
        # Approval
        sa.Column("requires_approval", sa.Boolean, server_default="true"),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True)),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        # Custom sections
        sa.Column("custom_sections", postgresql.JSONB),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    op.create_index("ix_proposals_prospect", "proposals", ["prospect_id"])
    op.create_index("ix_proposals_status", "proposals", ["status"])
    op.create_index("ix_proposals_advisor", "proposals", ["advisor_id"])

    # ------------------------------------------------------------------
    # 5. lead_scoring_rules
    # ------------------------------------------------------------------
    op.create_table(
        "lead_scoring_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "advisor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("advisors.id"),
            nullable=False,
        ),
        sa.Column("rule_name", sa.String(100), nullable=False),
        sa.Column("rule_category", sa.String(50), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("field_name", sa.String(100), nullable=False),
        sa.Column("operator", sa.String(20), nullable=False),
        sa.Column("value", sa.String(500), nullable=False),
        sa.Column("points", sa.Integer, nullable=False),
        sa.Column("max_points", sa.Integer),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("priority", sa.Integer, server_default="100"),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "advisor_id", "rule_name", name="uq_scoring_rule"
        ),
    )

    # ------------------------------------------------------------------
    # 6. email_templates
    # ------------------------------------------------------------------
    op.create_table(
        "email_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "advisor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("advisors.id"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("body_html", sa.Text, nullable=False),
        sa.Column("body_text", sa.Text),
        sa.Column("variables", postgresql.ARRAY(sa.String)),
        sa.Column("times_used", sa.Integer, server_default="0"),
        sa.Column("open_rate", sa.Numeric(5, 4)),
        sa.Column("reply_rate", sa.Numeric(5, 4)),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("is_default", sa.Boolean, server_default="false"),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    op.create_index(
        "ix_email_templates_advisor", "email_templates", ["advisor_id"]
    )
    op.create_index(
        "ix_email_templates_category", "email_templates", ["category"]
    )

    # ------------------------------------------------------------------
    # 7. pipeline_stage_configs
    # ------------------------------------------------------------------
    op.create_table(
        "pipeline_stage_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "advisor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("advisors.id"),
            nullable=False,
        ),
        sa.Column("stage_key", sa.String(50), nullable=False),
        sa.Column("stage_name", sa.String(100), nullable=False),
        sa.Column("stage_order", sa.Integer, nullable=False),
        sa.Column("color", sa.String(20), server_default="#6B7280"),
        sa.Column("auto_advance_days", sa.Integer),
        sa.Column("reminder_days", sa.Integer),
        sa.Column("required_activities", postgresql.ARRAY(sa.String)),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("is_terminal", sa.Boolean, server_default="false"),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "advisor_id", "stage_order", name="uq_stage_order"
        ),
    )

    # ------------------------------------------------------------------
    # 8. Full-text search trigger for prospects
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE OR REPLACE FUNCTION prospects_search_trigger() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('english', COALESCE(NEW.first_name, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(NEW.last_name, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
                setweight(to_tsvector('english', COALESCE(NEW.company, '')), 'B') ||
                setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C');
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER prospects_search_update
        BEFORE INSERT OR UPDATE ON prospects
        FOR EACH ROW EXECUTE FUNCTION prospects_search_trigger();
        """
    )


def downgrade() -> None:
    # Drop trigger + function
    op.execute("DROP TRIGGER IF EXISTS prospects_search_update ON prospects")
    op.execute("DROP FUNCTION IF EXISTS prospects_search_trigger()")

    # Drop tables (reverse order of creation)
    op.drop_table("pipeline_stage_configs")
    op.drop_table("email_templates")
    op.drop_table("lead_scoring_rules")
    op.drop_table("proposals")
    op.drop_table("prospect_activities")
    op.drop_table("prospects")

    # Drop enums
    op.execute("DROP TYPE IF EXISTS proposalstatus")
    op.execute("DROP TYPE IF EXISTS activitytype")
    op.execute("DROP TYPE IF EXISTS leadsource")
    op.execute("DROP TYPE IF EXISTS prospectstatus")
