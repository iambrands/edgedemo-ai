"""
PDF text extraction service using PyMuPDF.
Falls back to mock data if PyMuPDF is not installed.
"""
import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Try to import PyMuPDF
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    logger.warning("PyMuPDF not installed. PDF parsing will use mock data.")


class PDFService:
    """Service for extracting text from PDFs."""
    
    @staticmethod
    def is_available() -> bool:
        """Check if PDF extraction is available."""
        return HAS_PYMUPDF
    
    @staticmethod
    async def extract_text_from_path(file_path: str) -> str:
        """Extract text from a PDF file on disk."""
        if not HAS_PYMUPDF:
            return PDFService._mock_text_from_filename(os.path.basename(file_path))
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF not found: {file_path}")
        
        text_parts = []
        
        try:
            with fitz.open(file_path) as doc:
                for page in doc:
                    text_parts.append(page.get_text())
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            raise
        
        return "\n".join(text_parts)
    
    @staticmethod
    async def extract_text_from_bytes(file_bytes: bytes, filename: str = "") -> str:
        """Extract text from PDF bytes."""
        if not HAS_PYMUPDF:
            return PDFService._mock_text_from_filename(filename)
        
        text_parts = []
        
        try:
            with fitz.open(stream=file_bytes, filetype="pdf") as doc:
                for page in doc:
                    text_parts.append(page.get_text())
        except Exception as e:
            logger.error(f"Error extracting text from PDF bytes: {e}")
            raise
        
        return "\n".join(text_parts)
    
    @staticmethod
    def _mock_text_from_filename(filename: str) -> str:
        """Generate mock PDF content based on filename for demo."""
        filename_lower = filename.lower()
        
        if "nw mutual" in filename_lower or "northwestern" in filename_lower:
            return """
Northwestern Mutual Life Insurance Company
Variable Annuity Statement
Account Number: XXXX-1234

Investment Options Summary
                                        
Fund Name                          Units        Value
-----------------------------------------------------
NWM Large Cap Growth              125.5      $5,234.56
NWM Bond Fund                     200.0      $4,123.45
NWM International Equity           75.3      $3,456.78
NWM Small Cap Value                50.0      $2,345.67
NWM Money Market                  150.0      $1,500.00
NWM Target Date 2040             100.0      $4,567.89
NWM Real Estate Investment        80.0      $2,987.65
NWM Technology Select             45.0      $3,675.34

Total Account Value: $27,891.34

Fee Schedule:
Mortality & Expense (M&E): 1.25%
Administrative Fee: 0.15%
Average Fund Expense: 0.65%
Optional Rider Fee: 0.30%
Total Annual Fees: 2.35%

Surrender Schedule:
Year 1-2: 7%
Year 3-4: 5%
Year 5-6: 3%
Year 7+: 0%
"""
        
        elif "robinhood" in filename_lower:
            return """
Robinhood Securities LLC
Monthly Account Statement

Account Holder: Nicole Wilson
Account Type: Individual Brokerage
Statement Date: January 31, 2026

Current Holdings:

Symbol    Security Name                    Shares    Price      Value
----------------------------------------------------------------------
NVDA      NVIDIA Corporation               15.50    $552.90   $8,569.95
AAPL      Apple Inc.                       25.00    $195.00   $4,875.00
META      Meta Platforms Inc.               8.00    $598.70   $4,789.56

Total Account Value: $18,234.51

Commissions: $0.00
Platform Fee: $0.00

Stock Lending Program: Enrolled
Securities Eligible for Lending: NVDA, AAPL, META
"""
        
        elif "etrade" in filename_lower or "morgan stanley" in filename_lower:
            return """
E*TRADE from Morgan Stanley
401(k) Retirement Plan Statement

Participant: Nicole Wilson
Plan Sponsor: Wilson Enterprises LLC
Statement Period: Q4 2025

Investment Options:

Fund Name                              Balance        Allocation
----------------------------------------------------------------
Vanguard 500 Index Fund               $3,567.89         40.6%
Fidelity Total Bond Index             $2,345.67         26.7%
Schwab International Index            $1,890.45         21.5%
Money Market Fund                       $975.67         11.1%

Total Account Balance: $8,779.68

Annual Plan Fee: 0.45%
Average Fund Expense: 0.08%

Employer Match: 100% of first 3%, 50% of next 2%
Vesting: 100% Immediate
"""
        
        else:
            # Generic brokerage statement
            return f"""
Investment Account Statement
Filename: {filename}

Account Summary:
Total Value: $50,000.00

Holdings:
VTI - Vanguard Total Stock Market ETF - 100 shares - $25,000.00
BND - Vanguard Total Bond Market ETF - 150 shares - $15,000.00
VXUS - Vanguard Total International Stock - 80 shares - $10,000.00

Fees: 0.05%
"""


pdf_service = PDFService()
