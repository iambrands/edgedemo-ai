"""Add conversation intelligence tables

Revision ID: 010
Revises: 009
Create Date: 2025-02-05
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Create ENUM types
    # ------------------------------------------------------------------
    op.execute(
        "CREATE TYPE compliancerisklevel AS ENUM "
        "('low', 'medium', 'high', 'critical')"
    )
    op.execute(
        """
        CREATE TYPE compliancecategorytype AS ENUM (
            'performance_guarantee', 'unsuitable_recommendation',
            'missing_disclosure', 'prohibited_statement',
            'misleading_information', 'unauthorized_promise',
            'privacy_violation', 'fiduciary_breach',
            'regulatory_violation', 'other'
        )
        """
    )
    op.execute(
        "CREATE TYPE sentimenttype AS ENUM "
        "('very_positive', 'positive', 'neutral', 'negative', 'very_negative')"
    )
    op.execute(
        "CREATE TYPE actionitemstatus AS ENUM "
        "('pending', 'in_progress', 'completed', 'cancelled', 'overdue')"
    )
    op.execute(
        "CREATE TYPE actionitempriority AS ENUM "
        "('low', 'medium', 'high', 'urgent')"
    )

    # ------------------------------------------------------------------
    # 2. conversation_analyses
    # ------------------------------------------------------------------
    op.create_table(
        "conversation_analyses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "meeting_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("meetings.id"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "advisor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("advisors.id"),
            nullable=False,
        ),
        sa.Column(
            "client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id"),
        ),
        # Analysis status
        sa.Column(
            "analysis_status", sa.String(50), server_default="pending"
        ),
        sa.Column("analyzed_at", sa.DateTime(timezone=True)),
        sa.Column(
            "analysis_version", sa.String(20), server_default="1.0"
        ),
        # Duration / talk-time
        sa.Column(
            "total_duration_seconds", sa.Integer, server_default="0"
        ),
        sa.Column(
            "talk_time_advisor_seconds", sa.Integer, server_default="0"
        ),
        sa.Column(
            "talk_time_client_seconds", sa.Integer, server_default="0"
        ),
        sa.Column("talk_ratio", sa.Numeric(5, 4)),
        sa.Column("silence_percentage", sa.Numeric(5, 4)),
        # Word counts
        sa.Column("total_words", sa.Integer, server_default="0"),
        sa.Column("advisor_words", sa.Integer, server_default="0"),
        sa.Column("client_words", sa.Integer, server_default="0"),
        # Sentiment
        sa.Column(
            "overall_sentiment",
            sa.Enum(
                "very_positive",
                "positive",
                "neutral",
                "negative",
                "very_negative",
                name="sentimenttype",
            ),
            server_default="neutral",
        ),
        sa.Column("sentiment_score", sa.Numeric(5, 4)),
        sa.Column(
            "client_sentiment",
            sa.Enum(
                "very_positive",
                "positive",
                "neutral",
                "negative",
                "very_negative",
                name="sentimenttype",
                create_type=False,
            ),
            server_default="neutral",
        ),
        sa.Column("client_sentiment_score", sa.Numeric(5, 4)),
        sa.Column("sentiment_timeline", postgresql.JSONB),
        # Engagement
        sa.Column("engagement_score", sa.Integer, server_default="50"),
        sa.Column(
            "questions_asked_advisor", sa.Integer, server_default="0"
        ),
        sa.Column(
            "questions_asked_client", sa.Integer, server_default="0"
        ),
        sa.Column("interruptions_count", sa.Integer, server_default="0"),
        # Topics
        sa.Column("topics_discussed", postgresql.ARRAY(sa.String)),
        sa.Column("topic_breakdown", postgresql.JSONB),
        sa.Column("primary_topic", sa.String(100)),
        # Key points
        sa.Column("key_points", postgresql.ARRAY(sa.String)),
        sa.Column("decisions_made", postgresql.ARRAY(sa.String)),
        sa.Column("concerns_raised", postgresql.ARRAY(sa.String)),
        # Compliance summary
        sa.Column(
            "compliance_flags_count", sa.Integer, server_default="0"
        ),
        sa.Column(
            "compliance_risk_level",
            sa.Enum(
                "low",
                "medium",
                "high",
                "critical",
                name="compliancerisklevel",
            ),
            server_default="low",
        ),
        sa.Column(
            "compliance_reviewed",
            sa.Boolean,
            server_default="false",
        ),
        sa.Column(
            "compliance_reviewed_by", postgresql.UUID(as_uuid=True)
        ),
        sa.Column(
            "compliance_reviewed_at", sa.DateTime(timezone=True)
        ),
        # Action items summary
        sa.Column(
            "action_items_count", sa.Integer, server_default="0"
        ),
        sa.Column(
            "action_items_completed", sa.Integer, server_default="0"
        ),
        # AI summaries
        sa.Column("executive_summary", sa.Text),
        sa.Column("detailed_summary", sa.Text),
        sa.Column(
            "follow_up_recommendations", postgresql.ARRAY(sa.String)
        ),
        # Next steps
        sa.Column(
            "suggested_next_meeting", sa.DateTime(timezone=True)
        ),
        sa.Column("suggested_next_topic", sa.String(255)),
        # Raw data
        sa.Column("raw_analysis", postgresql.JSONB),
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
        "ix_conversation_analyses_meeting",
        "conversation_analyses",
        ["meeting_id"],
    )
    op.create_index(
        "ix_conversation_analyses_advisor",
        "conversation_analyses",
        ["advisor_id"],
    )
    op.create_index(
        "ix_conversation_analyses_client",
        "conversation_analyses",
        ["client_id"],
    )
    op.create_index(
        "ix_conversation_analyses_date",
        "conversation_analyses",
        ["analyzed_at"],
    )

    # ------------------------------------------------------------------
    # 3. compliance_flags
    # ------------------------------------------------------------------
    op.create_table(
        "compliance_flags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "analysis_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("conversation_analyses.id"),
            nullable=False,
        ),
        sa.Column(
            "category",
            sa.Enum(
                "performance_guarantee",
                "unsuitable_recommendation",
                "missing_disclosure",
                "prohibited_statement",
                "misleading_information",
                "unauthorized_promise",
                "privacy_violation",
                "fiduciary_breach",
                "regulatory_violation",
                "other",
                name="compliancecategorytype",
            ),
            nullable=False,
        ),
        sa.Column(
            "risk_level",
            sa.Enum(
                "low",
                "medium",
                "high",
                "critical",
                name="compliancerisklevel",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("flagged_text", sa.Text, nullable=False),
        sa.Column("context_before", sa.Text),
        sa.Column("context_after", sa.Text),
        sa.Column("timestamp_start", sa.Integer, nullable=False),
        sa.Column("timestamp_end", sa.Integer, nullable=False),
        sa.Column("speaker", sa.String(100)),
        sa.Column("ai_explanation", sa.Text, nullable=False),
        sa.Column(
            "ai_confidence", sa.Numeric(5, 4), server_default="0.85"
        ),
        sa.Column("suggested_correction", sa.Text),
        sa.Column("regulatory_reference", sa.String(500)),
        sa.Column("status", sa.String(50), server_default="pending"),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True)),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("review_notes", sa.Text),
        sa.Column(
            "remediation_required", sa.Boolean, server_default="false"
        ),
        sa.Column("remediation_action", sa.Text),
        sa.Column(
            "remediation_completed_at", sa.DateTime(timezone=True)
        ),
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
        "ix_compliance_flags_analysis",
        "compliance_flags",
        ["analysis_id"],
    )
    op.create_index(
        "ix_compliance_flags_risk",
        "compliance_flags",
        ["risk_level"],
    )
    op.create_index(
        "ix_compliance_flags_category",
        "compliance_flags",
        ["category"],
    )
    op.create_index(
        "ix_compliance_flags_status",
        "compliance_flags",
        ["status"],
    )

    # ------------------------------------------------------------------
    # 4. conversation_action_items
    # ------------------------------------------------------------------
    op.create_table(
        "conversation_action_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "analysis_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("conversation_analyses.id"),
            nullable=False,
        ),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("source_text", sa.Text),
        sa.Column("timestamp", sa.Integer),
        sa.Column("speaker", sa.String(100)),
        sa.Column("assigned_to", postgresql.UUID(as_uuid=True)),
        sa.Column("assigned_to_name", sa.String(255)),
        sa.Column(
            "owner_type", sa.String(20), server_default="advisor"
        ),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "in_progress",
                "completed",
                "cancelled",
                "overdue",
                name="actionitemstatus",
            ),
            server_default="pending",
        ),
        sa.Column(
            "priority",
            sa.Enum(
                "low",
                "medium",
                "high",
                "urgent",
                name="actionitempriority",
            ),
            server_default="medium",
        ),
        sa.Column("due_date", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column(
            "ai_generated", sa.Boolean, server_default="true"
        ),
        sa.Column(
            "ai_confidence", sa.Numeric(5, 4), server_default="0.85"
        ),
        sa.Column("category", sa.String(100)),
        sa.Column("notes", sa.Text),
        sa.Column("completion_notes", sa.Text),
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
        "ix_conversation_action_items_analysis",
        "conversation_action_items",
        ["analysis_id"],
    )
    op.create_index(
        "ix_conversation_action_items_assignee",
        "conversation_action_items",
        ["assigned_to"],
    )
    op.create_index(
        "ix_conversation_action_items_status",
        "conversation_action_items",
        ["status"],
    )
    op.create_index(
        "ix_conversation_action_items_due",
        "conversation_action_items",
        ["due_date"],
    )

    # ------------------------------------------------------------------
    # 5. speaker_segments
    # ------------------------------------------------------------------
    op.create_table(
        "speaker_segments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "analysis_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("conversation_analyses.id"),
            nullable=False,
        ),
        sa.Column("speaker_label", sa.String(100), nullable=False),
        sa.Column("speaker_id", postgresql.UUID(as_uuid=True)),
        sa.Column("start_time", sa.Integer, nullable=False),
        sa.Column("end_time", sa.Integer, nullable=False),
        sa.Column("duration_seconds", sa.Integer, nullable=False),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("word_count", sa.Integer, server_default="0"),
        sa.Column(
            "sentiment",
            sa.Enum(
                "very_positive",
                "positive",
                "neutral",
                "negative",
                "very_negative",
                name="sentimenttype",
                create_type=False,
            ),
            server_default="neutral",
        ),
        sa.Column("sentiment_score", sa.Numeric(5, 4)),
        sa.Column(
            "contains_question", sa.Boolean, server_default="false"
        ),
        sa.Column(
            "contains_action_item", sa.Boolean, server_default="false"
        ),
        sa.Column(
            "contains_compliance_concern",
            sa.Boolean,
            server_default="false",
        ),
        sa.Column("topics", postgresql.ARRAY(sa.String)),
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
        "ix_speaker_segments_analysis",
        "speaker_segments",
        ["analysis_id"],
    )
    op.create_index(
        "ix_speaker_segments_speaker",
        "speaker_segments",
        ["speaker_label"],
    )
    op.create_index(
        "ix_speaker_segments_time",
        "speaker_segments",
        ["start_time"],
    )

    # ------------------------------------------------------------------
    # 6. compliance_rules
    # ------------------------------------------------------------------
    op.create_table(
        "compliance_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "advisor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("advisors.id"),
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column(
            "category",
            sa.Enum(
                "performance_guarantee",
                "unsuitable_recommendation",
                "missing_disclosure",
                "prohibited_statement",
                "misleading_information",
                "unauthorized_promise",
                "privacy_violation",
                "fiduciary_breach",
                "regulatory_violation",
                "other",
                name="compliancecategorytype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "risk_level",
            sa.Enum(
                "low",
                "medium",
                "high",
                "critical",
                name="compliancerisklevel",
                create_type=False,
            ),
            server_default="medium",
        ),
        sa.Column("keywords", postgresql.ARRAY(sa.String)),
        sa.Column("phrases", postgresql.ARRAY(sa.String)),
        sa.Column("regex_patterns", postgresql.ARRAY(sa.String)),
        sa.Column(
            "use_ai_detection", sa.Boolean, server_default="true"
        ),
        sa.Column("ai_prompt", sa.Text),
        sa.Column("regulatory_reference", sa.String(500)),
        sa.Column("suggested_language", sa.Text),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("is_system", sa.Boolean, server_default="false"),
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
        "ix_compliance_rules_advisor",
        "compliance_rules",
        ["advisor_id"],
    )
    op.create_index(
        "ix_compliance_rules_category",
        "compliance_rules",
        ["category"],
    )

    # ------------------------------------------------------------------
    # 7. conversation_insights
    # ------------------------------------------------------------------
    op.create_table(
        "conversation_insights",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "advisor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("advisors.id"),
            nullable=False,
        ),
        sa.Column(
            "period_start",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "period_end",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "period_type", sa.String(20), server_default="weekly"
        ),
        sa.Column(
            "total_conversations", sa.Integer, server_default="0"
        ),
        sa.Column(
            "total_duration_minutes", sa.Integer, server_default="0"
        ),
        sa.Column("avg_sentiment_score", sa.Numeric(5, 4)),
        sa.Column(
            "avg_engagement_score", sa.Integer, server_default="50"
        ),
        sa.Column("avg_talk_ratio", sa.Numeric(5, 4)),
        sa.Column(
            "total_compliance_flags", sa.Integer, server_default="0"
        ),
        sa.Column(
            "high_risk_flags", sa.Integer, server_default="0"
        ),
        sa.Column(
            "flags_resolved", sa.Integer, server_default="0"
        ),
        sa.Column(
            "total_action_items", sa.Integer, server_default="0"
        ),
        sa.Column(
            "action_items_completed", sa.Integer, server_default="0"
        ),
        sa.Column("completion_rate", sa.Numeric(5, 4)),
        sa.Column("top_topics", postgresql.JSONB),
        sa.Column("topic_trends", postgresql.JSONB),
        sa.Column(
            "coaching_opportunities", postgresql.ARRAY(sa.String)
        ),
        sa.Column(
            "strengths_identified", postgresql.ARRAY(sa.String)
        ),
        sa.Column(
            "areas_for_improvement", postgresql.ARRAY(sa.String)
        ),
        sa.Column("period_summary", sa.Text),
        sa.Column("recommendations", postgresql.ARRAY(sa.String)),
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
        "ix_conversation_insights_advisor",
        "conversation_insights",
        ["advisor_id"],
    )
    op.create_index(
        "ix_conversation_insights_period",
        "conversation_insights",
        ["period_start", "period_end"],
    )

    # ------------------------------------------------------------------
    # 8. Seed system compliance rules
    # ------------------------------------------------------------------
    op.execute(
        """
        INSERT INTO compliance_rules
            (id, name, description, category, risk_level,
             keywords, phrases, is_active, is_system,
             created_at, updated_at)
        VALUES
        (
            gen_random_uuid(),
            'Performance Guarantee Detection',
            'Detects promises of specific returns or guaranteed performance',
            'performance_guarantee', 'critical',
            ARRAY['guarantee','guaranteed','promise','assured','certain'],
            ARRAY['guaranteed return','promise you will make',
                  'certain to gain','assure you of profits'],
            true, true, now(), now()
        ),
        (
            gen_random_uuid(),
            'Unsuitable Recommendation Detection',
            'Flags potentially unsuitable investment recommendations',
            'unsuitable_recommendation', 'high',
            ARRAY['all-in','everything','entire portfolio',
                  'dont need diversification'],
            ARRAY['put everything in','dont worry about risk',
                  'cant lose'],
            true, true, now(), now()
        ),
        (
            gen_random_uuid(),
            'Missing Risk Disclosure',
            'Identifies when risks are not properly disclosed',
            'missing_disclosure', 'medium',
            ARRAY['no risk','risk-free','safe bet','cant go wrong'],
            ARRAY['there is no risk','completely safe',
                  'nothing to worry about'],
            true, true, now(), now()
        )
        """
    )


def downgrade() -> None:
    # Drop tables in reverse dependency order
    op.drop_table("conversation_insights")
    op.drop_table("compliance_rules")
    op.drop_table("speaker_segments")
    op.drop_table("conversation_action_items")
    op.drop_table("compliance_flags")
    op.drop_table("conversation_analyses")

    # Drop enums
    op.execute("DROP TYPE IF EXISTS actionitempriority")
    op.execute("DROP TYPE IF EXISTS actionitemstatus")
    op.execute("DROP TYPE IF EXISTS sentimenttype")
    op.execute("DROP TYPE IF EXISTS compliancecategorytype")
    op.execute("DROP TYPE IF EXISTS compliancerisklevel")
