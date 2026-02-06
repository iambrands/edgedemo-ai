"""Meeting Intelligence API Endpoints"""
import os
import tempfile
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/meetings", tags=["Meeting Intelligence"])


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class ParticipantSchema(BaseModel):
    name: str
    email: Optional[str] = None
    role: Optional[str] = None


class MeetingCreate(BaseModel):
    household_id: str
    title: str
    meeting_type: str = "ad_hoc"
    scheduled_at: Optional[datetime] = None
    platform: Optional[str] = None
    participants: List[ParticipantSchema] = []


class MeetingResponse(BaseModel):
    id: str
    household_id: str
    advisor_id: str
    title: str
    meeting_type: str
    status: str
    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    duration_seconds: Optional[int]
    platform: Optional[str]
    participants: List[dict]
    created_at: datetime
    has_transcript: bool = False
    has_analysis: bool = False


class TranscriptSegment(BaseModel):
    speaker: str
    start: float
    end: float
    text: str
    confidence: Optional[float] = None


class TranscriptResponse(BaseModel):
    id: str
    meeting_id: str
    raw_text: Optional[str]
    segments: List[dict]
    word_count: int
    confidence_score: Optional[float]
    language: str
    created_at: datetime


class ActionItemSchema(BaseModel):
    id: str
    description: str
    assigned_to: Optional[str]
    due_date: Optional[datetime]
    priority: str
    status: str
    source_text: Optional[str]
    created_at: datetime


class AnalysisResponse(BaseModel):
    id: str
    meeting_id: str
    executive_summary: Optional[str]
    detailed_notes: Optional[str]
    key_topics: List[str]
    client_concerns: List[dict]
    life_events: List[dict]
    action_items: List[ActionItemSchema]
    risk_tolerance_signals: Optional[dict]
    sentiment_score: Optional[float]
    sentiment_breakdown: Optional[dict]
    compliance_flags: List[dict]
    requires_review: bool
    suggested_followup_email: Optional[str]
    next_meeting_topics: List[str]
    model_used: Optional[str]
    created_at: datetime


class ActionItemUpdate(BaseModel):
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    assigned_to: Optional[str] = None


# ============================================================================
# DEMO DATA (for standalone operation without database)
# ============================================================================

DEMO_MEETINGS = {
    "mtg-001": {
        "id": "mtg-001",
        "household_id": "hh-001",
        "advisor_id": "ria-001",
        "title": "Q1 2026 Portfolio Review - Wilson Household",
        "meeting_type": "quarterly_review",
        "status": "completed",
        "scheduled_at": "2026-02-04T10:00:00Z",
        "started_at": "2026-02-04T10:02:00Z",
        "ended_at": "2026-02-04T10:35:00Z",
        "duration_seconds": 1980,
        "platform": "zoom",
        "participants": [
            {"name": "Leslie Wilson", "role": "advisor"},
            {"name": "Nicole Wilson", "role": "client"}
        ],
        "created_at": "2026-02-01T09:00:00Z",
        "has_transcript": True,
        "has_analysis": True
    },
    "mtg-002": {
        "id": "mtg-002",
        "household_id": "hh-002",
        "advisor_id": "ria-001",
        "title": "Annual Review - Henderson Family",
        "meeting_type": "annual_review",
        "status": "scheduled",
        "scheduled_at": "2026-02-10T14:00:00Z",
        "started_at": None,
        "ended_at": None,
        "duration_seconds": None,
        "platform": "in_person",
        "participants": [
            {"name": "Leslie Wilson", "role": "advisor"},
            {"name": "Mark Henderson", "role": "client"},
            {"name": "Susan Henderson", "role": "client"}
        ],
        "created_at": "2026-02-03T11:00:00Z",
        "has_transcript": False,
        "has_analysis": False
    },
    "mtg-003": {
        "id": "mtg-003",
        "household_id": "hh-003",
        "advisor_id": "ria-001",
        "title": "Retirement Planning Session - Martinez",
        "meeting_type": "planning_session",
        "status": "processing",
        "scheduled_at": "2026-02-03T11:00:00Z",
        "started_at": "2026-02-03T11:05:00Z",
        "ended_at": "2026-02-03T12:00:00Z",
        "duration_seconds": 3300,
        "platform": "teams",
        "participants": [
            {"name": "Leslie Wilson", "role": "advisor"},
            {"name": "Carlos Martinez", "role": "client"}
        ],
        "created_at": "2026-01-30T08:00:00Z",
        "has_transcript": True,
        "has_analysis": False
    }
}

DEMO_ANALYSIS = {
    "mtg-001": {
        "id": "analysis-001",
        "meeting_id": "mtg-001",
        "executive_summary": "Quarterly review with Nicole Wilson covering portfolio performance, college savings planning for daughter starting in 2 years, tax-loss harvesting opportunities, and estate planning updates due to mother moving in.",
        "detailed_notes": """## Meeting Notes - Q1 2026 Portfolio Review

### Portfolio Performance
- Current allocation: 60% equities, 40% fixed income
- YTD performance: +4.2% vs benchmark +3.8%
- Client expressed concern about recent market volatility

### College Planning
- Daughter Emma starting college Fall 2028
- 529 balance: $42,000
- Discussed shifting to age-based conservative allocation

### Tax Planning
- Identified $3,200 in harvestable losses
- Will execute trades before quarter end

### Estate Planning
- Mother moving in triggers need for estate review
- Referred to estate planning partner""",
        "key_topics": [
            "Portfolio performance",
            "Market volatility",
            "529 college savings",
            "Tax-loss harvesting",
            "Estate planning",
            "Elder care"
        ],
        "client_concerns": [
            {"concern": "Market volatility affecting retirement timeline", "severity": "medium", "requires_action": True},
            {"concern": "529 allocation for 2-year timeline", "severity": "medium", "requires_action": True},
            {"concern": "Estate plan outdated", "severity": "high", "requires_action": True}
        ],
        "life_events": [
            {"event": "Mother moving in", "timeline": "upcoming", "financial_impact": "Healthcare costs, estate planning review"},
            {"event": "Daughter starting college (2 years)", "timeline": "upcoming", "financial_impact": "529 withdrawals needed"}
        ],
        "risk_tolerance_signals": {
            "current_assessment": "moderate",
            "signals": ["Concern about volatility", "Asked about conservative options"],
            "recommended_review": False
        },
        "sentiment_score": 0.45,
        "sentiment_breakdown": {"positive": 0.55, "neutral": 0.35, "negative": 0.10},
        "compliance_flags": [
            {"type": "documentation", "description": "Life event triggers suitability review", "severity": "info"}
        ],
        "requires_review": False,
        "suggested_followup_email": """Dear Nicole,

Thank you for our quarterly review meeting today. I wanted to summarize our discussion and next steps.

**Key Points:**
- Your portfolio is performing well at +4.2% YTD
- We identified tax-loss harvesting opportunities (~$3,200)
- We'll review your 529 allocation for Emma's timeline

**Action Items:**
1. I'll prepare 529 reallocation options (due: Feb 11)
2. Tax-loss harvesting trades will be executed this week
3. Estate planning consultation scheduled for Feb 15

Please let me know if you have any questions.

Best regards,
Leslie Wilson, CFP®""",
        "next_meeting_topics": ["529 reallocation decision", "Estate plan update", "Tax planning for next year"],
        "model_used": "claude-sonnet-4-20250514",
        "created_at": "2026-02-04T10:40:00Z"
    }
}

DEMO_ACTION_ITEMS = {
    "mtg-001": [
        {
            "id": "action-001",
            "description": "Prepare 529 reallocation options for review",
            "assigned_to": "advisor",
            "due_date": "2026-02-11T17:00:00Z",
            "priority": "high",
            "status": "pending",
            "source_text": "I'll put together some options for our next meeting",
            "created_at": "2026-02-04T10:40:00Z"
        },
        {
            "id": "action-002",
            "description": "Execute tax-loss harvesting trades",
            "assigned_to": "advisor",
            "due_date": "2026-02-07T17:00:00Z",
            "priority": "high",
            "status": "in_progress",
            "source_text": "Let me run the analysis and we can discuss specific trades",
            "created_at": "2026-02-04T10:40:00Z"
        },
        {
            "id": "action-003",
            "description": "Schedule estate planning consultation",
            "assigned_to": "advisor",
            "due_date": "2026-02-08T17:00:00Z",
            "priority": "high",
            "status": "completed",
            "source_text": "I'll connect you with our estate planning partner",
            "created_at": "2026-02-04T10:40:00Z"
        },
        {
            "id": "action-004",
            "description": "Send meeting summary email",
            "assigned_to": "advisor",
            "due_date": "2026-02-04T18:00:00Z",
            "priority": "high",
            "status": "completed",
            "source_text": "I'll send a summary email with the action items",
            "created_at": "2026-02-04T10:40:00Z"
        }
    ]
}

DEMO_TRANSCRIPT = {
    "mtg-001": {
        "id": "transcript-001",
        "meeting_id": "mtg-001",
        "raw_text": """Good morning Nicole, thanks for coming in today. I wanted to go over your portfolio performance this quarter and discuss any concerns you might have.

Thank you for meeting with me. I've been a bit worried about the market volatility lately, especially with my retirement getting closer.

I completely understand. Let's look at your current allocation. You're at about 60% equities and 40% fixed income, which is appropriate for your timeline. The volatility you're seeing is normal market behavior.

That makes sense. I've also been thinking about my daughter's college fund. She'll be starting in about two years.

Great point. We should review the 529 allocation and perhaps shift to a more conservative mix given the shorter timeline. I'll put together some options for our next meeting.

That would be helpful. Also, my husband mentioned something about tax-loss harvesting. Is that something we should consider?

Absolutely. Looking at your taxable account, there are some positions with unrealized losses that we could harvest to offset gains. Let me run the analysis and we can discuss specific trades.

Perfect. One more thing - my mother is moving in with us and I want to make sure our estate plan is up to date.

That's a significant life event. I'll connect you with our estate planning partner to review beneficiaries and any necessary updates. Is there anything else on your mind?

No, I think that covers everything. Thank you for being so thorough.

Of course. I'll send a summary email with the action items and we'll schedule a follow-up in a few weeks.""",
        "segments": [
            {"speaker": "Leslie Wilson", "start": 0.0, "end": 15.0, "text": "Good morning Nicole, thanks for coming in today. I wanted to go over your portfolio performance this quarter and discuss any concerns you might have."},
            {"speaker": "Nicole Wilson", "start": 15.0, "end": 28.0, "text": "Thank you for meeting with me. I've been a bit worried about the market volatility lately, especially with my retirement getting closer."},
            {"speaker": "Leslie Wilson", "start": 28.0, "end": 52.0, "text": "I completely understand. Let's look at your current allocation. You're at about 60% equities and 40% fixed income, which is appropriate for your timeline. The volatility you're seeing is normal market behavior."},
            {"speaker": "Nicole Wilson", "start": 52.0, "end": 65.0, "text": "That makes sense. I've also been thinking about my daughter's college fund. She'll be starting in about two years."},
            {"speaker": "Leslie Wilson", "start": 65.0, "end": 85.0, "text": "Great point. We should review the 529 allocation and perhaps shift to a more conservative mix given the shorter timeline. I'll put together some options for our next meeting."},
            {"speaker": "Nicole Wilson", "start": 85.0, "end": 100.0, "text": "That would be helpful. Also, my husband mentioned something about tax-loss harvesting. Is that something we should consider?"},
            {"speaker": "Leslie Wilson", "start": 100.0, "end": 125.0, "text": "Absolutely. Looking at your taxable account, there are some positions with unrealized losses that we could harvest to offset gains. Let me run the analysis and we can discuss specific trades."},
            {"speaker": "Nicole Wilson", "start": 125.0, "end": 140.0, "text": "Perfect. One more thing - my mother is moving in with us and I want to make sure our estate plan is up to date."},
            {"speaker": "Leslie Wilson", "start": 140.0, "end": 165.0, "text": "That's a significant life event. I'll connect you with our estate planning partner to review beneficiaries and any necessary updates. Is there anything else on your mind?"},
            {"speaker": "Nicole Wilson", "start": 165.0, "end": 175.0, "text": "No, I think that covers everything. Thank you for being so thorough."},
            {"speaker": "Leslie Wilson", "start": 175.0, "end": 190.0, "text": "Of course. I'll send a summary email with the action items and we'll schedule a follow-up in a few weeks."}
        ],
        "word_count": 312,
        "confidence_score": 0.94,
        "language": "en",
        "created_at": "2026-02-04T10:38:00Z"
    }
}


# ============================================================================
# AUTH DEPENDENCY
# ============================================================================

try:
    from backend.api.auth import get_current_user
except ImportError:
    from api.auth import get_current_user


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/", response_model=List[MeetingResponse])
async def list_meetings(
    household_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """List meetings with optional filters"""
    meetings = list(DEMO_MEETINGS.values())
    
    if household_id:
        meetings = [m for m in meetings if m["household_id"] == household_id]
    if status:
        meetings = [m for m in meetings if m["status"] == status]
    
    # Sort by created_at descending
    meetings.sort(key=lambda x: x["created_at"], reverse=True)
    
    return meetings[offset:offset + limit]


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get meeting details"""
    meeting = DEMO_MEETINGS.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("/", response_model=MeetingResponse)
async def create_meeting(
    meeting_data: MeetingCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new meeting record"""
    import uuid
    
    meeting_id = f"mtg-{str(uuid.uuid4())[:8]}"
    now = datetime.utcnow().isoformat() + "Z"
    
    meeting = {
        "id": meeting_id,
        "household_id": meeting_data.household_id,
        "advisor_id": current_user.get("id", "ria-001"),
        "title": meeting_data.title,
        "meeting_type": meeting_data.meeting_type,
        "status": "scheduled",
        "scheduled_at": meeting_data.scheduled_at.isoformat() + "Z" if meeting_data.scheduled_at else None,
        "started_at": None,
        "ended_at": None,
        "duration_seconds": None,
        "platform": meeting_data.platform,
        "participants": [p.dict() for p in meeting_data.participants],
        "created_at": now,
        "has_transcript": False,
        "has_analysis": False
    }
    
    DEMO_MEETINGS[meeting_id] = meeting
    return meeting


@router.post("/{meeting_id}/upload-recording")
async def upload_recording(
    meeting_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload meeting recording for transcription and analysis.
    Accepts: mp3, mp4, mpeg, mpga, m4a, wav, webm
    """
    meeting = DEMO_MEETINGS.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Validate file type
    allowed_extensions = ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"]
    file_ext = file.filename.split(".")[-1].lower() if file.filename else ""
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Save file temporarily
    with tempfile.NamedTemporaryFile(suffix=f".{file_ext}", delete=False) as f:
        content = await file.read()
        f.write(content)
        temp_path = f.name
    
    # Update meeting status
    meeting["status"] = "processing"
    
    # Process in background
    background_tasks.add_task(
        process_meeting_recording,
        meeting_id=meeting_id,
        audio_path=temp_path,
        participant_names=[p.get("name") for p in meeting.get("participants", [])]
    )
    
    return {"message": "Recording uploaded. Processing started.", "meeting_id": meeting_id}


@router.get("/{meeting_id}/transcript", response_model=TranscriptResponse)
async def get_transcript(
    meeting_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get meeting transcript"""
    meeting = DEMO_MEETINGS.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    transcript = DEMO_TRANSCRIPT.get(meeting_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not available")
    
    return transcript


@router.get("/{meeting_id}/analysis", response_model=AnalysisResponse)
async def get_analysis(
    meeting_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get meeting analysis"""
    meeting = DEMO_MEETINGS.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    analysis = DEMO_ANALYSIS.get(meeting_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not available")
    
    # Add action items to response
    analysis["action_items"] = DEMO_ACTION_ITEMS.get(meeting_id, [])
    
    return analysis


@router.get("/{meeting_id}/action-items", response_model=List[ActionItemSchema])
async def get_action_items(
    meeting_id: str,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get action items for a meeting"""
    meeting = DEMO_MEETINGS.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    items = DEMO_ACTION_ITEMS.get(meeting_id, [])
    
    if status:
        items = [i for i in items if i["status"] == status]
    
    return items


@router.patch("/{meeting_id}/action-items/{item_id}")
async def update_action_item(
    meeting_id: str,
    item_id: str,
    update: ActionItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an action item"""
    items = DEMO_ACTION_ITEMS.get(meeting_id, [])
    
    for item in items:
        if item["id"] == item_id:
            if update.status:
                item["status"] = update.status
            if update.due_date:
                item["due_date"] = update.due_date.isoformat() + "Z"
            if update.assigned_to:
                item["assigned_to"] = update.assigned_to
            return item
    
    raise HTTPException(status_code=404, detail="Action item not found")


@router.post("/{meeting_id}/regenerate-analysis")
async def regenerate_analysis(
    meeting_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Regenerate meeting analysis from existing transcript"""
    meeting = DEMO_MEETINGS.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    transcript = DEMO_TRANSCRIPT.get(meeting_id)
    if not transcript:
        raise HTTPException(status_code=400, detail="No transcript available")
    
    background_tasks.add_task(
        run_meeting_analysis,
        meeting_id=meeting_id
    )
    
    return {"message": "Analysis regeneration started"}


# ============================================================================
# BACKGROUND TASKS
# ============================================================================

async def process_meeting_recording(
    meeting_id: str,
    audio_path: str,
    participant_names: List[str]
):
    """Background task to process meeting recording"""
    try:
        from backend.services.transcription_service import (
            transcription_service, diarization_service,
            merge_transcription_with_diarization
        )
        from backend.services.meeting_analysis_service import meeting_analysis_service
    except ImportError:
        from services.transcription_service import (
            transcription_service, diarization_service,
            merge_transcription_with_diarization
        )
        from services.meeting_analysis_service import meeting_analysis_service
    
    try:
        meeting = DEMO_MEETINGS.get(meeting_id)
        if not meeting:
            return
        
        # Step 1: Transcribe
        transcription = await transcription_service.transcribe_audio(audio_path)
        
        # Step 2: Diarize
        diarization = await diarization_service.identify_speakers(
            audio_path,
            participant_names=participant_names
        )
        
        # Step 3: Merge
        merged_segments = merge_transcription_with_diarization(transcription, diarization)
        
        # Step 4: Save transcript (in-memory for demo)
        import uuid
        transcript_id = f"transcript-{str(uuid.uuid4())[:8]}"
        DEMO_TRANSCRIPT[meeting_id] = {
            "id": transcript_id,
            "meeting_id": meeting_id,
            "raw_text": transcription.get("text", ""),
            "segments": merged_segments,
            "word_count": len(transcription.get("text", "").split()),
            "confidence_score": 0.92,
            "language": transcription.get("language", "en"),
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        
        # Step 5: Analyze
        analysis_result = await meeting_analysis_service.analyze_meeting(
            merged_segments,
            household_context={"name": "Demo Household"},
            meeting_type=meeting.get("meeting_type", "ad_hoc")
        )
        
        # Step 6: Save analysis
        analysis_id = f"analysis-{str(uuid.uuid4())[:8]}"
        DEMO_ANALYSIS[meeting_id] = {
            "id": analysis_id,
            "meeting_id": meeting_id,
            "executive_summary": analysis_result.get("executive_summary"),
            "detailed_notes": analysis_result.get("detailed_notes"),
            "key_topics": analysis_result.get("key_topics", []),
            "client_concerns": analysis_result.get("client_concerns", []),
            "life_events": analysis_result.get("life_events", []),
            "risk_tolerance_signals": analysis_result.get("risk_tolerance_signals"),
            "sentiment_score": analysis_result.get("sentiment_analysis", {}).get("overall_score"),
            "sentiment_breakdown": analysis_result.get("sentiment_analysis", {}).get("breakdown"),
            "compliance_flags": analysis_result.get("compliance_flags", []),
            "requires_review": any(f.get("severity") == "critical" for f in analysis_result.get("compliance_flags", [])),
            "suggested_followup_email": analysis_result.get("follow_up", {}).get("suggested_email_body"),
            "next_meeting_topics": analysis_result.get("follow_up", {}).get("next_meeting_topics", []),
            "model_used": analysis_result.get("model_used"),
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        
        # Step 7: Create action items
        DEMO_ACTION_ITEMS[meeting_id] = []
        for i, item in enumerate(analysis_result.get("action_items", [])):
            action_id = f"action-{str(uuid.uuid4())[:8]}"
            DEMO_ACTION_ITEMS[meeting_id].append({
                "id": action_id,
                "description": item.get("description"),
                "assigned_to": item.get("assigned_to"),
                "due_date": item.get("due_date_suggestion"),
                "priority": item.get("priority", "medium"),
                "status": "pending",
                "source_text": item.get("source_quote"),
                "created_at": datetime.utcnow().isoformat() + "Z"
            })
        
        # Update meeting status
        meeting["status"] = "completed"
        meeting["has_transcript"] = True
        meeting["has_analysis"] = True
        meeting["ended_at"] = datetime.utcnow().isoformat() + "Z"
        if transcription.get("duration"):
            meeting["duration_seconds"] = int(transcription["duration"])
        
        logger.info(f"Meeting {meeting_id} processing completed")
        
    except Exception as e:
        logger.error(f"Meeting processing failed: {e}")
        meeting = DEMO_MEETINGS.get(meeting_id)
        if meeting:
            meeting["status"] = "failed"
    finally:
        # Clean up temp file
        if os.path.exists(audio_path):
            os.unlink(audio_path)


async def run_meeting_analysis(meeting_id: str):
    """Re-run analysis on existing transcript"""
    try:
        from backend.services.meeting_analysis_service import meeting_analysis_service
    except ImportError:
        from services.meeting_analysis_service import meeting_analysis_service
    
    try:
        meeting = DEMO_MEETINGS.get(meeting_id)
        transcript = DEMO_TRANSCRIPT.get(meeting_id)
        
        if not meeting or not transcript:
            return
        
        analysis_result = await meeting_analysis_service.analyze_meeting(
            transcript.get("segments", []),
            household_context={"name": "Demo Household"},
            meeting_type=meeting.get("meeting_type", "ad_hoc")
        )
        
        # Update analysis
        if meeting_id in DEMO_ANALYSIS:
            DEMO_ANALYSIS[meeting_id].update({
                "executive_summary": analysis_result.get("executive_summary"),
                "detailed_notes": analysis_result.get("detailed_notes"),
                "key_topics": analysis_result.get("key_topics", []),
                "client_concerns": analysis_result.get("client_concerns", []),
                "life_events": analysis_result.get("life_events", []),
                "compliance_flags": analysis_result.get("compliance_flags", []),
                "model_used": analysis_result.get("model_used")
            })
        
        logger.info(f"Meeting {meeting_id} analysis regenerated")
        
    except Exception as e:
        logger.error(f"Analysis regeneration failed: {e}")
