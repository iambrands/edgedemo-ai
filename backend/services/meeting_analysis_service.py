"""AI-powered meeting analysis using Claude"""
import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Lazy-load Anthropic client
_anthropic_client = None


def get_anthropic_client():
    """Get or create Anthropic client."""
    global _anthropic_client
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    if _anthropic_client is None:
        try:
            from anthropic import Anthropic
            _anthropic_client = Anthropic(api_key=api_key)
        except Exception as e:
            logger.warning(f"Could not initialize Anthropic client: {e}")
            return None
    return _anthropic_client


class MeetingAnalysisService:
    """Analyzes meeting transcripts using Claude for insights extraction"""
    
    def __init__(self):
        self.model = "claude-sonnet-4-20250514"
    
    async def analyze_meeting(
        self,
        transcript_segments: List[Dict[str, Any]],
        household_context: Optional[Dict[str, Any]] = None,
        meeting_type: str = "quarterly_review"
    ) -> Dict[str, Any]:
        """
        Comprehensive meeting analysis using Claude.
        
        Returns structured analysis including:
        - Executive summary
        - Key topics discussed
        - Client concerns and life events
        - Action items
        - Risk tolerance signals
        - Compliance flags
        - Follow-up recommendations
        """
        client = get_anthropic_client()
        
        if not client:
            logger.warning("Anthropic client not available, using mock analysis")
            return self._mock_analysis(transcript_segments)
        
        # Format transcript for analysis
        formatted_transcript = self._format_transcript(transcript_segments)
        
        # Build context
        context = self._build_context(household_context, meeting_type)
        
        # Analysis prompt
        prompt = f"""You are an expert RIA compliance officer and meeting analyst. Analyze this client meeting transcript and extract structured insights.

{context}

<transcript>
{formatted_transcript}
</transcript>

Analyze this meeting and provide a JSON response with the following structure:

{{
    "executive_summary": "2-3 sentence summary of the meeting",
    "detailed_notes": "Comprehensive meeting notes in markdown format",
    "key_topics": ["topic1", "topic2"],
    "client_concerns": [
        {{"concern": "description", "severity": "low|medium|high", "requires_action": true|false}}
    ],
    "life_events": [
        {{"event": "description", "timeline": "past|current|upcoming", "financial_impact": "description"}}
    ],
    "risk_tolerance_signals": {{
        "current_assessment": "conservative|moderate|aggressive",
        "signals": ["signal1", "signal2"],
        "recommended_review": true|false
    }},
    "action_items": [
        {{
            "description": "action description",
            "assigned_to": "advisor|client|operations",
            "priority": "low|medium|high|urgent",
            "due_date_suggestion": "YYYY-MM-DD or null",
            "source_quote": "exact quote from transcript"
        }}
    ],
    "conversation_metrics": {{
        "advisor_talk_percentage": 0.0-1.0,
        "questions_asked_by_advisor": 0,
        "client_engagement_level": "low|medium|high"
    }},
    "compliance_flags": [
        {{"type": "suitability|disclosure|documentation", "description": "description", "severity": "info|warning|critical"}}
    ],
    "sentiment_analysis": {{
        "overall_score": -1.0 to 1.0,
        "breakdown": {{"positive": 0.0-1.0, "neutral": 0.0-1.0, "negative": 0.0-1.0}},
        "notable_moments": ["moment1", "moment2"]
    }},
    "follow_up": {{
        "suggested_email_subject": "subject line",
        "suggested_email_body": "email body text",
        "next_meeting_topics": ["topic1", "topic2"],
        "documents_to_prepare": ["doc1", "doc2"]
    }}
}}

Be thorough but concise. Flag any compliance concerns immediately. Extract exact quotes for action items."""

        try:
            response = client.messages.create(
                model=self.model,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Parse JSON response
            response_text = response.content[0].text
            
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0]
            else:
                json_str = response_text
            
            analysis = json.loads(json_str.strip())
            analysis["model_used"] = self.model
            analysis["analyzed_at"] = datetime.utcnow().isoformat()
            
            return analysis
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse analysis JSON: {e}")
            return self._mock_analysis(transcript_segments)
        except Exception as e:
            logger.error(f"Meeting analysis failed: {e}")
            return self._mock_analysis(transcript_segments)
    
    def _format_transcript(self, segments: List[Dict[str, Any]]) -> str:
        """Format transcript segments for analysis"""
        lines = []
        for seg in segments:
            speaker = seg.get("speaker", "Unknown")
            text = seg.get("text", "").strip()
            timestamp = f"[{seg.get('start', 0):.1f}s]"
            lines.append(f"{timestamp} {speaker}: {text}")
        return "\n".join(lines)
    
    def _build_context(
        self,
        household_context: Optional[Dict[str, Any]],
        meeting_type: str
    ) -> str:
        """Build context string for analysis"""
        context_parts = [f"Meeting type: {meeting_type}"]
        
        if household_context:
            if household_context.get("name"):
                context_parts.append(f"Household: {household_context['name']}")
            if household_context.get("total_value"):
                context_parts.append(f"AUM: ${household_context['total_value']:,.2f}")
            if household_context.get("risk_score"):
                context_parts.append(f"Current risk score: {household_context['risk_score']}")
            if household_context.get("members"):
                context_parts.append(f"Members: {', '.join(household_context['members'])}")
        
        return "\n".join(context_parts)
    
    def _mock_analysis(self, transcript_segments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Mock analysis for demo/development when Claude is not available"""
        return {
            "executive_summary": "Quarterly review meeting with Nicole Wilson discussing portfolio performance, college savings planning, tax-loss harvesting opportunities, and estate planning updates due to family changes.",
            "detailed_notes": """## Meeting Notes - Quarterly Review

### Portfolio Review
- Current allocation: 60% equities, 40% fixed income
- Appropriate for retirement timeline
- Client expressed concern about market volatility

### College Planning
- Daughter starting college in 2 years
- Need to review 529 allocation
- Recommend shifting to more conservative mix

### Tax Planning
- Tax-loss harvesting opportunity identified in taxable account
- Will analyze positions with unrealized losses

### Life Events
- Mother moving in with family
- Estate plan review needed
- Will connect with estate planning partner""",
            "key_topics": [
                "Portfolio performance",
                "Market volatility concerns",
                "College savings (529 plan)",
                "Tax-loss harvesting",
                "Estate planning",
                "Elder care planning"
            ],
            "client_concerns": [
                {"concern": "Market volatility impacting retirement timeline", "severity": "medium", "requires_action": True},
                {"concern": "College fund timeline (2 years)", "severity": "medium", "requires_action": True},
                {"concern": "Estate plan may be outdated", "severity": "high", "requires_action": True}
            ],
            "life_events": [
                {"event": "Mother moving in (elder care)", "timeline": "upcoming", "financial_impact": "May need to review healthcare and estate planning"},
                {"event": "Daughter starting college in 2 years", "timeline": "upcoming", "financial_impact": "529 withdrawals and allocation shift needed"}
            ],
            "risk_tolerance_signals": {
                "current_assessment": "moderate",
                "signals": ["Expressed concern about volatility", "Retirement timeline sensitivity", "Asked about conservative options for 529"],
                "recommended_review": False
            },
            "action_items": [
                {
                    "description": "Prepare 529 reallocation options for review",
                    "assigned_to": "advisor",
                    "priority": "high",
                    "due_date_suggestion": None,
                    "source_quote": "I'll put together some options for our next meeting"
                },
                {
                    "description": "Run tax-loss harvesting analysis on taxable account",
                    "assigned_to": "advisor",
                    "priority": "medium",
                    "due_date_suggestion": None,
                    "source_quote": "Let me run the analysis and we can discuss specific trades"
                },
                {
                    "description": "Schedule estate planning consultation",
                    "assigned_to": "advisor",
                    "priority": "high",
                    "due_date_suggestion": None,
                    "source_quote": "I'll connect you with our estate planning partner to review beneficiaries"
                },
                {
                    "description": "Send meeting summary email with action items",
                    "assigned_to": "advisor",
                    "priority": "high",
                    "due_date_suggestion": None,
                    "source_quote": "I'll send a summary email with the action items"
                }
            ],
            "conversation_metrics": {
                "advisor_talk_percentage": 0.55,
                "questions_asked_by_advisor": 3,
                "client_engagement_level": "high"
            },
            "compliance_flags": [
                {"type": "documentation", "description": "Estate plan review triggered by life event - ensure proper documentation", "severity": "info"},
                {"type": "suitability", "description": "529 reallocation should be documented with rationale", "severity": "info"}
            ],
            "sentiment_analysis": {
                "overall_score": 0.4,
                "breakdown": {"positive": 0.5, "neutral": 0.4, "negative": 0.1},
                "notable_moments": ["Client expressed gratitude for thoroughness", "Some anxiety about market volatility"]
            },
            "follow_up": {
                "suggested_email_subject": "Follow-up: Quarterly Review - Action Items & Next Steps",
                "suggested_email_body": """Dear Nicole,

Thank you for taking the time to meet with me today. I enjoyed our discussion and wanted to summarize the key points and next steps.

**Key Discussion Points:**
- Reviewed portfolio performance and addressed your concerns about market volatility
- Discussed shifting your 529 allocation given the 2-year timeline for college
- Identified potential tax-loss harvesting opportunities
- Noted your mother's upcoming move and the need for estate plan review

**Action Items:**
1. I will prepare 529 reallocation options for your review
2. I will run a tax-loss harvesting analysis on your taxable account
3. I will coordinate with our estate planning partner to schedule a consultation

Please don't hesitate to reach out if you have any questions before our next meeting.

Best regards,
Leslie Wilson, CFP®""",
                "next_meeting_topics": ["529 reallocation decision", "Tax-loss harvesting trades", "Estate plan update status"],
                "documents_to_prepare": ["529 reallocation proposals", "Tax-loss harvesting analysis", "Estate planning checklist"]
            },
            "model_used": "mock-analysis-v1",
            "analyzed_at": datetime.utcnow().isoformat()
        }
    
    async def generate_followup_email(
        self,
        analysis: Dict[str, Any],
        advisor_name: str,
        client_name: str
    ) -> Dict[str, str]:
        """Generate a personalized follow-up email based on meeting analysis"""
        client = get_anthropic_client()
        
        if not client:
            return {
                "subject": analysis.get("follow_up", {}).get("suggested_email_subject", "Follow-up: Our Recent Meeting"),
                "body": analysis.get("follow_up", {}).get("suggested_email_body", "")
            }
        
        prompt = f"""Generate a professional follow-up email from a financial advisor to their client after a meeting.

Advisor: {advisor_name}
Client: {client_name}

Meeting Summary: {analysis.get('executive_summary', '')}

Action Items:
{json.dumps(analysis.get('action_items', []), indent=2)}

Key Topics Discussed:
{json.dumps(analysis.get('key_topics', []), indent=2)}

Write a warm, professional email that:
1. Thanks them for their time
2. Summarizes key discussion points
3. Lists action items with owners
4. Confirms next steps
5. Offers availability for questions

Return JSON: {{"subject": "...", "body": "..."}}"""

        try:
            response = client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            
            result = json.loads(response.content[0].text)
            return result
        except Exception as e:
            logger.error(f"Email generation failed: {e}")
            return {
                "subject": analysis.get("follow_up", {}).get("suggested_email_subject", "Follow-up: Our Recent Meeting"),
                "body": analysis.get("follow_up", {}).get("suggested_email_body", "")
            }


# Singleton instance
meeting_analysis_service = MeetingAnalysisService()
