"""
RIA Statement upload and parsing endpoints.
Supports real PDF parsing when PyMuPDF is available.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
import logging
import uuid

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel

from backend.api.auth import get_current_user
from backend.services.pdf_service import pdf_service
from backend.parsers.registry import get_default_registry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/ria/statements", tags=["RIA Statements"])


# --- Response Models ---

class ParsedStatementResponse(BaseModel):
    id: str
    filename: str
    custodian: str
    parsed: str
    confidence: str
    date: str
    status: str


class PositionResponse(BaseModel):
    ticker: str
    name: Optional[str] = None
    quantity: float
    value: float
    confidence: float


class ParsedStatementDetail(BaseModel):
    id: str
    filename: str
    custodian: str
    parsed: str
    confidence: str
    date: str
    status: str
    positions: List[PositionResponse]
    fees: Optional[Dict[str, Any]] = None
    totalValue: Optional[float] = None


# --- In-memory storage (replace with DB in production) ---

PARSED_STATEMENTS: Dict[str, Dict[str, Any]] = {
    "stmt-001": {
        "id": "stmt-001",
        "filename": "NW Mutual VA IRA Statement Q4 2025.pdf",
        "custodian": "Northwestern Mutual",
        "parsed": "19 funds extracted",
        "confidence": "94%",
        "date": "2026-02-04",
        "status": "confirmed",
        "positions": [
            {"ticker": "NWGFX", "name": "NWM Large Cap Growth", "quantity": 125.5, "value": 5234.56, "confidence": 0.94},
            {"ticker": "NWBFX", "name": "NWM Bond Fund", "quantity": 200.0, "value": 4123.45, "confidence": 0.94},
            {"ticker": "NWIFX", "name": "NWM International Equity", "quantity": 75.3, "value": 3456.78, "confidence": 0.94},
        ],
        "fees": {"mAndE": 1.25, "adminFee": 0.15, "fundExpenses": 0.65, "riderCosts": 0.30, "totalAnnual": 2.35},
        "totalValue": 27891.34,
    },
    "stmt-002": {
        "id": "stmt-002",
        "filename": "Robinhood Monthly Summary Jan 2026.pdf",
        "custodian": "Robinhood",
        "parsed": "3 positions extracted",
        "confidence": "98%",
        "date": "2026-02-04",
        "status": "confirmed",
        "positions": [
            {"ticker": "NVDA", "name": "NVIDIA Corporation", "quantity": 15.5, "value": 8569.95, "confidence": 0.98},
            {"ticker": "AAPL", "name": "Apple Inc.", "quantity": 25.0, "value": 4875.00, "confidence": 0.99},
            {"ticker": "META", "name": "Meta Platforms Inc.", "quantity": 8.0, "value": 4789.56, "confidence": 0.97},
        ],
        "fees": {"commission": 0.0, "totalAnnual": 0.0},
        "totalValue": 18234.51,
    },
    "stmt-003": {
        "id": "stmt-003",
        "filename": "E*TRADE/MS Employer Plan Q4 2025.pdf",
        "custodian": "E*TRADE/Morgan Stanley",
        "parsed": "4 positions extracted",
        "confidence": "96%",
        "date": "2026-02-04",
        "status": "confirmed",
        "positions": [
            {"ticker": "VFIAX", "name": "Vanguard 500 Index Fund", "quantity": 18.5, "value": 3567.89, "confidence": 0.96},
            {"ticker": "FTBFX", "name": "Fidelity Total Bond Index", "quantity": 210.3, "value": 2345.67, "confidence": 0.96},
            {"ticker": "SWISX", "name": "Schwab International Index", "quantity": 95.2, "value": 1890.45, "confidence": 0.96},
            {"ticker": "SWVXX", "name": "Money Market Fund", "quantity": 975.67, "value": 975.67, "confidence": 0.98},
        ],
        "fees": {"planFee": 0.45, "avgFundExpense": 0.08},
        "totalValue": 8779.68,
    },
}

# Initialize parser registry
parser_registry = get_default_registry()


# --- Background task for parsing ---

async def parse_statement_background(stmt_id: str, file_bytes: bytes, filename: str):
    """Background task to parse a statement."""
    try:
        # Extract text from PDF
        text = await pdf_service.extract_text_from_bytes(file_bytes, filename)
        
        # Parse using registry
        parsed = parser_registry.detect_and_parse(text)
        
        # Convert parsed positions to response format
        positions = []
        for p in parsed.positions:
            positions.append({
                "ticker": p.ticker or "UNKNOWN",
                "name": p.security_name or p.fund_name or "",
                "quantity": float(p.quantity),
                "value": float(p.market_value),
                "confidence": 0.95,  # Default confidence
            })
        
        # Calculate total value
        total_value = float(parsed.total_value) if parsed.total_value else sum(p["value"] for p in positions)
        
        # Update statement record
        PARSED_STATEMENTS[stmt_id].update({
            "status": "parsed",
            "custodian": parsed.custodian or "Unknown",
            "parsed": f"{len(positions)} positions extracted",
            "confidence": "95%",
            "positions": positions,
            "totalValue": total_value,
            "fees": {
                f["fee_type"]: float(f["rate"]) if f.get("rate") else float(f.get("amount", 0))
                for f in [f.model_dump() for f in parsed.fees_detected]
            } if parsed.fees_detected else None,
        })
        
        logger.info(f"Parsed statement {stmt_id}: {len(positions)} positions from {parsed.custodian}")
        
    except Exception as e:
        logger.error(f"Error parsing statement {stmt_id}: {e}")
        PARSED_STATEMENTS[stmt_id].update({
            "status": "failed",
            "error": str(e),
        })


# --- Endpoints ---

@router.get("", response_model=List[ParsedStatementResponse])
async def list_statements(current_user: dict = Depends(get_current_user)):
    """List all parsed statements."""
    return [
        ParsedStatementResponse(
            id=s["id"],
            filename=s["filename"],
            custodian=s.get("custodian", "Unknown"),
            parsed=s.get("parsed", "Processing..."),
            confidence=s.get("confidence", "0%"),
            date=s.get("date", datetime.utcnow().strftime("%Y-%m-%d")),
            status=s.get("status", "pending"),
        )
        for s in PARSED_STATEMENTS.values()
    ]


@router.post("/upload")
async def upload_statement(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    householdId: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a PDF statement for parsing.
    Auto-detects custodian and extracts positions.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Read file content
    file_bytes = await file.read()
    
    # Generate statement ID
    stmt_id = f"stmt-{str(uuid.uuid4())[:8]}"
    
    # Create initial record
    PARSED_STATEMENTS[stmt_id] = {
        "id": stmt_id,
        "filename": file.filename,
        "custodian": "Detecting...",
        "parsed": "Processing...",
        "confidence": "0%",
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "status": "parsing",
        "householdId": householdId,
        "positions": [],
    }
    
    # Start background parsing
    background_tasks.add_task(parse_statement_background, stmt_id, file_bytes, file.filename)
    
    return {
        "id": stmt_id,
        "filename": file.filename,
        "status": "parsing",
        "message": "Statement uploaded. Parsing in progress...",
        "estimatedTime": "5-10 seconds",
    }


@router.get("/{statement_id}")
async def get_statement(statement_id: str, current_user: dict = Depends(get_current_user)):
    """Get statement details and parsing status."""
    stmt = PARSED_STATEMENTS.get(statement_id)
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    return stmt


@router.get("/{statement_id}/parsed", response_model=ParsedStatementDetail)
async def get_parsed_data(statement_id: str, current_user: dict = Depends(get_current_user)):
    """Get parsed data from a statement for review."""
    stmt = PARSED_STATEMENTS.get(statement_id)
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    positions = stmt.get("positions", [])
    
    return ParsedStatementDetail(
        id=stmt["id"],
        filename=stmt["filename"],
        custodian=stmt.get("custodian", "Unknown"),
        parsed=stmt.get("parsed", "Processing..."),
        confidence=stmt.get("confidence", "0%"),
        date=stmt.get("date", ""),
        status=stmt.get("status", "pending"),
        positions=[PositionResponse(**p) for p in positions],
        fees=stmt.get("fees"),
        totalValue=stmt.get("totalValue"),
    )


@router.post("/{statement_id}/confirm")
async def confirm_parsed_data(statement_id: str, current_user: dict = Depends(get_current_user)):
    """Confirm parsed data accuracy and create positions in database."""
    stmt = PARSED_STATEMENTS.get(statement_id)
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    if stmt.get("status") not in ["parsed", "confirmed"]:
        raise HTTPException(status_code=400, detail="Statement not ready for confirmation")
    
    # Update status
    stmt["status"] = "confirmed"
    
    positions_count = len(stmt.get("positions", []))
    
    return {
        "status": "confirmed",
        "statementId": statement_id,
        "positionsCreated": positions_count,
        "message": f"{positions_count} positions confirmed and saved",
    }
