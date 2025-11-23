"""
EdgeAI Portfolio Analyzer Backend API
Handles portfolio analysis requests using OpenAI GPT API
"""

import os
import json
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, HTTPException, Request, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from anthropic import Anthropic
import logging
import pandas as pd
import io
from typing import List, Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="EdgeAI Portfolio Analyzer API",
    description="Backend API for EdgeAI Portfolio Analysis powered by OpenAI GPT",
    version="1.0.0"
)

# Initialize rate limiter (in-memory for simple deployment)
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Anthropic client
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")  # Fallback for compatibility
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY environment variable is required")

anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)


# Pydantic models for request/response validation
class ClientInfo(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=18, le=120)
    riskTolerance: str = Field(..., pattern="^(Conservative|Moderate|Medium|Aggressive)$")
    primaryGoal: str = Field(..., pattern="^(Retirement|Growth|Income|Wealth Preservation)$")


class Holding(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=10, pattern="^[A-Z0-9]+$")
    amount: float = Field(..., gt=0, le=1000000000)  # Max $1B per holding
    
    @validator('ticker')
    def ticker_uppercase(cls, v):
        return v.upper()


class AnalyzePortfolioRequest(BaseModel):
    client: ClientInfo
    holdings: List[Holding] = Field(..., min_items=1, max_items=50)
    
    @validator('holdings')
    def validate_holdings(cls, v):
        total_value = sum(h.amount for h in v)
        if total_value > 10000000000:  # Max $10B total portfolio
            raise ValueError("Total portfolio value exceeds maximum allowed")
        return v


class PortfolioHealth(BaseModel):
    score: int = Field(..., ge=0, le=100)
    grade: str
    summary: str


class TaxOptimization(BaseModel):
    annualSavings: str
    opportunities: List[str]
    tlhCandidates: List[str]


class Rebalancing(BaseModel):
    needsRebalancing: bool
    recommendations: List[str]
    targetAllocation: str


class RetirementReadiness(BaseModel):
    score: int = Field(..., ge=0, le=100)
    monthlyNeeded: str
    onTrack: bool
    recommendation: str


class Compliance(BaseModel):
    suitabilityScore: int = Field(..., ge=0, le=100)
    issues: List[str]
    status: str


class BehavioralCoaching(BaseModel):
    message: str
    sentiment: str


class PerformanceMetrics(BaseModel):
    portfolioBeta: Optional[float] = Field(None, ge=0, le=5)
    sharpeRatio: Optional[float] = Field(None, ge=-5, le=5)
    dividendYield: Optional[float] = Field(None, ge=0, le=20)
    concentrationRisk: Optional[float] = Field(None, ge=0, le=100)
    geographicExposure: Optional[Dict[str, float]] = None  # {"US": 80.0, "International": 20.0}
    sectorAllocation: Optional[Dict[str, float]] = None  # {"Technology": 35.0, "Healthcare": 20.0}


class AssetAllocation(BaseModel):
    equities: float = Field(..., ge=0, le=100)
    fixedIncome: float = Field(..., ge=0, le=100)
    cash: float = Field(..., ge=0, le=100)
    alternatives: float = Field(0, ge=0, le=100)


class AnalyzePortfolioResponse(BaseModel):
    portfolioHealth: PortfolioHealth
    taxOptimization: TaxOptimization
    rebalancing: Rebalancing
    retirementReadiness: RetirementReadiness
    compliance: Compliance
    behavioralCoaching: BehavioralCoaching
    performanceMetrics: Optional[PerformanceMetrics] = None
    assetAllocation: Optional[AssetAllocation] = None


def create_analysis_prompt(client: ClientInfo, holdings: List[Holding]) -> str:
    """Create the prompt for OpenAI to analyze the portfolio"""
    
    holdings_summary = "\n".join([
        f"- {h.ticker}: ${h.amount:,.2f}"
        for h in holdings
    ])
    
    total_value = sum(h.amount for h in holdings)
    
    prompt = f"""You are an expert financial advisor providing comprehensive portfolio analysis using institutional-grade investment intelligence.

CLIENT PROFILE:
- Name: {client.name}
- Age: {client.age}
- Risk Tolerance: {client.riskTolerance}
- Primary Investment Goal: {client.primaryGoal}

PORTFOLIO HOLDINGS:
{holdings_summary}
Total Portfolio Value: ${total_value:,.2f}

Please provide a comprehensive portfolio analysis in the following JSON structure. Be specific, professional, and actionable:

{{
    "portfolioHealth": {{
        "score": <number 0-100>,
        "grade": "<letter grade like A-, B+, C>",
        "summary": "<2-3 sentence professional summary of overall portfolio health>"
    }},
    "taxOptimization": {{
        "annualSavings": "<estimated range like $2,000 - $4,500>",
        "opportunities": [
            "<specific tax optimization opportunity 1>",
            "<specific tax optimization opportunity 2>",
            "<specific tax optimization opportunity 3>"
        ],
        "tlhCandidates": ["<ticker1>", "<ticker2>"]
    }},
    "rebalancing": {{
        "needsRebalancing": <true or false>,
        "recommendations": [
            "<specific rebalancing recommendation 1>",
            "<specific rebalancing recommendation 2>"
        ],
        "targetAllocation": "<description of ideal allocation strategy>"
    }},
    "retirementReadiness": {{
        "score": <number 0-100>,
        "monthlyNeeded": "<amount like $2,500>",
        "onTrack": <true or false>,
        "recommendation": "<actionable recommendation for retirement planning>"
    }},
    "compliance": {{
        "suitabilityScore": <number 0-100>,
        "issues": [
            "<compliance note or issue if any>"
        ],
        "status": "<Compliant or Needs Review>"
    }},
    "behavioralCoaching": {{
        "message": "<personalized, coach-like message tailored to this client's portfolio and goals. Be encouraging but realistic. 2-4 sentences.>",
        "sentiment": "<Positive, Neutral, or Cautionary>"
    }},
    "performanceMetrics": {{
        "portfolioBeta": <number 0.5-2.0, estimate portfolio's market correlation risk>,
        "sharpeRatio": <number -1 to 3, estimate risk-adjusted returns>,
        "dividendYield": <percentage 0-10, estimated annual dividend yield>,
        "concentrationRisk": <percentage 0-100, top 10 holdings percentage>,
        "geographicExposure": {{
            "US": <percentage>,
            "International": <percentage>,
            "Emerging Markets": <percentage>
        }},
        "sectorAllocation": {{
            "Technology": <percentage>,
            "Healthcare": <percentage>,
            "Financial Services": <percentage>,
            "Consumer Cyclical": <percentage>,
            "Consumer Defensive": <percentage>,
            "Industrials": <percentage>,
            "Energy": <percentage>,
            "Real Estate": <percentage>,
            "Utilities": <percentage>,
            "Other": <percentage>
        }}
    }},
    "assetAllocation": {{
        "equities": <percentage 0-100>,
        "fixedIncome": <percentage 0-100>,
        "cash": <percentage 0-100>,
        "alternatives": <percentage 0-100>
    }}
}}

IMPORTANT:
- Base analysis on the actual holdings provided
- Consider client's age, risk tolerance, and investment goals
- Provide realistic, actionable recommendations
- Use professional financial advisor language
- Return ONLY valid JSON, no markdown formatting or code blocks
- Ensure all scores are integers between 0-100
- Make recommendations specific to this portfolio, not generic advice
"""
    
    return prompt


def parse_openai_response(response_text: str) -> Dict[str, Any]:
    """Parse OpenAI's response and extract JSON"""
    
    # Try to find JSON in the response (sometimes OpenAI wraps it in markdown)
    json_match = re.search(r'\{[\s\S]*\}', response_text)
    if json_match:
        json_str = json_match.group(0)
    else:
        json_str = response_text
    
    # Clean up any markdown code blocks
    json_str = re.sub(r'```json\s*', '', json_str)
    json_str = re.sub(r'```\s*', '', json_str)
    json_str = json_str.strip()
    
    try:
        parsed = json.loads(json_str)
        return parsed
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse OpenAI response as JSON: {e}")
        logger.error(f"Response text: {response_text[:500]}")
        raise ValueError(f"Failed to parse AI response: {str(e)}")


# Serve frontend HTML file
FRONTEND_PATH = Path(__file__).parent.parent / "frontend" / "index.html"

@app.get("/")
async def serve_frontend():
    """Serve the frontend HTML file"""
    if FRONTEND_PATH.exists():
        return FileResponse(FRONTEND_PATH)
    return {
        "status": "healthy",
        "service": "EdgeAI Portfolio Analyzer API",
        "version": "1.0.0",
        "message": "Frontend not found. API is running."
    }


@app.get("/favicon.ico")
async def favicon():
    """Handle favicon requests to prevent 404 errors"""
    return JSONResponse(status_code=404, content={"detail": "Not found"})

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


def parse_portfolio_file(file_content: bytes, filename: str) -> List[Dict[str, Any]]:
    """
    Parse CSV or XLSX portfolio file from various brokerages (Robinhood, Fidelity, Schwab, etc.)
    and return holdings in standardized format
    """
    
    holdings = []
    
    try:
        # Determine file type
        file_ext = filename.lower().split('.')[-1]
        
        if file_ext == 'csv':
            # Try different encodings and delimiters for CSV
            try:
                df = pd.read_csv(io.BytesIO(file_content), encoding='utf-8')
            except UnicodeDecodeError:
                try:
                    df = pd.read_csv(io.BytesIO(file_content), encoding='latin-1')
                except:
                    df = pd.read_csv(io.BytesIO(file_content), encoding='cp1252')
            
        elif file_ext in ['xlsx', 'xls']:
            # Parse XLSX - read first sheet, skip header rows if needed
            df = pd.read_excel(io.BytesIO(file_content), engine='openpyxl', sheet_name=0)
            
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
        
        # Remove completely empty rows
        df = df.dropna(how='all')
        
        if len(df) == 0:
            raise ValueError("File appears to be empty")
        
        # Normalize column names (case-insensitive, strip whitespace, handle special chars)
        df.columns = df.columns.str.strip().str.lower().str.replace('_', ' ').str.replace('-', ' ')
        
        # Comprehensive ticker/symbol column detection
        # Supports major brokerages: Robinhood, Fidelity, Schwab, TD Ameritrade, Vanguard,
        # E*TRADE, Interactive Brokers, Merrill Edge, Ally Invest, Webull, M1 Finance, SoFi,
        # Betterment, Wealthfront, T. Rowe Price, and generic formats
        ticker_candidates = [
            # Standard names
            'symbol', 'ticker', 'sym', 'stock', 'security', 'instrument', 'name',
            'asset', 'holding', 'equity', 'investment', 'position',
            # Brokerage-specific variations
            'description', 'asset name', 'security name', 'instrument name',
            'equity name', 'holding name', 'position name', 'investment name',
            # Vanguard, Fidelity specific
            'fund symbol', 'fund name', 'security description', 'investment description',
            # Interactive Brokers
            'underlying symbol', 'base symbol', 'conid',
            # E*TRADE, Merrill Edge
            'symbol description', 'instrument description',
            # TD Ameritrade
            'cusip', 'symbol description',
            # Generic fallbacks
            'company', 'issuer', 'product'
        ]
        
        ticker_col = None
        for col in df.columns:
            col_clean = col.lower().strip()
            if any(candidate in col_clean for candidate in ticker_candidates):
                # Additional check: column should contain mostly text/alphanumeric
                sample_values = df[col].dropna().head(10).astype(str)
                if len(sample_values) > 0:
                    text_ratio = sum(1 for v in sample_values if any(c.isalpha() for c in str(v))) / len(sample_values)
                    if text_ratio > 0.5:  # At least 50% text
                        ticker_col = col
                        break
        
        # Comprehensive value/amount column detection
        # Supports various brokerage column naming conventions
        amount_candidates = [
            # Standard value columns
            'value', 'amount', 'balance', 'total value', 'market value', 'current value',
            'equity value', 'position value', 'account value',
            # Brokerage-specific value names
            'market price', 'last price', 'closing price', 'current price',
            'cost basis', 'cost', 'principal', 'book value', 'total cost',
            # Dollar amount indicators
            'usd', '$', 'dollar', 'dollars', 'us dollars', 'value in usd',
            # Fidelity/Vanguard specific
            'price per share', 'share price', 'current market value',
            # Share-based (we'll multiply by price if available)
            'quantity', 'qty', 'shares', 'share', 'units', 'unit', 'position size',
            'number of shares', 'share quantity',
            # Interactive Brokers
            'mtm p&l', 'unrealized p&l', 'realized p&l',
            # E*TRADE, Merrill Edge
            'market price', 'last price', 'settled cash'
        ]
        
        amount_col = None
        price_col = None
        shares_col = None
        
        for col in df.columns:
            col_clean = col.lower().strip()
            if any(candidate in col_clean for candidate in amount_candidates):
                # Check if it's a dollar amount column
                sample_values = df[col].dropna().head(10).astype(str)
                if len(sample_values) > 0:
                    # Check if values look like dollar amounts
                    dollar_indicators = sum(1 for v in sample_values if '$' in str(v) or 
                                          (v.replace(',', '').replace('.', '').replace('-', '').replace('$', '').isdigit()))
                    
                    if 'price' in col_clean or 'cost' in col_clean:
                        price_col = col
                    elif 'quantity' in col_clean or 'qty' in col_clean or 'shares' in col_clean or 'share' in col_clean:
                        shares_col = col
                    elif dollar_indicators / len(sample_values) > 0.5:
                        if amount_col is None:
                            amount_col = col
        
        # If we have shares and price, calculate value
        if shares_col and price_col and amount_col is None:
            # Will calculate below
            pass
        
        # Fallback: try to find numeric columns that might be values
        if amount_col is None:
            for col in df.columns:
                if df[col].dtype in ['float64', 'int64']:
                    sample_values = df[col].dropna().head(10)
                    if len(sample_values) > 0:
                        avg_value = abs(sample_values.mean())
                        # Reasonable portfolio values are typically in thousands
                        if 100 < avg_value < 10000000:  # Between $100 and $10M per holding
                            if amount_col is None:
                                amount_col = col
                                break
        
        # If still no ticker column, try first text column
        if ticker_col is None:
            for col in df.columns:
                if df[col].dtype == 'object':  # String type
                    sample = str(df[col].iloc[0]) if len(df) > 0 else ""
                    if any(c.isalpha() for c in sample) and len(sample) < 50:
                        ticker_col = col
                        break
        
        # If no amount column found, try first numeric column after ticker
        if amount_col is None:
            for col in df.columns:
                if col != ticker_col and df[col].dtype in ['float64', 'int64']:
                    amount_col = col
                    break
        
        if ticker_col is None:
            raise ValueError("Could not identify ticker/symbol column. Please check file format.")
        
        # Extract holdings
        for idx, row in df.iterrows():
            try:
                # Get ticker - handle various formats
                ticker_raw = str(row[ticker_col]).strip() if not pd.isna(row[ticker_col]) else ""
                
                if not ticker_raw or ticker_raw.lower() in ['nan', 'none', '']:
                    continue
                
                # Extract ticker symbol (may be in format like "AAPL - Apple Inc" or just "AAPL")
                ticker_parts = ticker_raw.split()
                ticker = ticker_parts[0].upper().strip('()[]{}')
                
                # Clean ticker (remove common suffixes like .US, .TO, etc.)
                ticker = ticker.split('.')[0].split('-')[0].split('(')[0]
                
                # Skip if ticker looks invalid
                if len(ticker) < 1 or len(ticker) > 10 or not ticker.replace('$', '').isalnum():
                    continue
                
                # Get amount/value
                amount_value = None
                
                # Case 1: Direct dollar amount column
                if amount_col:
                    try:
                        amount_str = str(row[amount_col]).replace(',', '').replace('$', '').strip()
                        # Remove common suffixes like " USD"
                        amount_str = amount_str.split()[0] if amount_str.split() else amount_str
                        amount_value = float(amount_str)
                    except (ValueError, TypeError):
                        pass
                
                # Case 2: Calculate from shares * price
                if amount_value is None and shares_col and price_col:
                    try:
                        shares = float(str(row[shares_col]).replace(',', '').strip())
                        price = float(str(row[price_col]).replace(',', '').replace('$', '').strip())
                        amount_value = shares * price
                    except (ValueError, TypeError):
                        pass
                
                # Case 3: Use shares if no price available (assume $1 per share as fallback)
                if amount_value is None and shares_col:
                    try:
                        shares = float(str(row[shares_col]).replace(',', '').strip())
                        if shares > 0:
                            # Use shares as dollar amount (user will need to verify)
                            amount_value = shares
                    except (ValueError, TypeError):
                        pass
                
                # Skip if no valid amount found
                if amount_value is None or amount_value <= 0:
                    continue
                
                # Skip very small amounts (likely errors)
                if amount_value < 0.01:
                    continue
                
                holdings.append({
                    "ticker": ticker,
                    "amount": round(amount_value, 2)
                })
                
            except Exception as e:
                logger.debug(f"Error parsing row {idx}: {str(e)}")
                continue
        
        # Remove duplicates (sum amounts if same ticker)
        holdings_dict = {}
        for h in holdings:
            ticker = h["ticker"]
            if ticker in holdings_dict:
                holdings_dict[ticker]["amount"] += h["amount"]
            else:
                holdings_dict[ticker] = h.copy()
        
        holdings = list(holdings_dict.values())
        
        if len(holdings) == 0:
            raise ValueError("No valid holdings found in file. Please check that the file contains ticker symbols and dollar amounts.")
        
        logger.info(f"Parsed {len(holdings)} holdings from {filename}")
        return holdings
        
    except Exception as e:
        logger.error(f"Error parsing file {filename}: {str(e)}", exc_info=True)
        if "Could not identify" in str(e) or "No valid holdings" in str(e):
            raise ValueError(str(e))
        raise ValueError(f"Could not parse file. Please ensure it's a valid CSV or XLSX file with ticker symbols and values.")


@app.post("/api/parse-file")
@limiter.limit("20/hour")
async def parse_file(request: Request, file: UploadFile = File(...)):
    """
    Parse portfolio file from major brokerages
    
    Automatically detects and parses export formats from:
    
    MAJOR BROKERAGES:
    - Robinhood (CSV)
    - Fidelity (CSV/XLSX)
    - Charles Schwab (CSV/XLSX)
    - TD Ameritrade (CSV/XLSX)
    - Vanguard (CSV/XLSX)
    - E*TRADE / Morgan Stanley (CSV/XLSX)
    - Interactive Brokers (CSV/XLSX)
    - Merrill Edge / Bank of America (CSV/XLSX)
    - Ally Invest (CSV/XLSX)
    - Webull (CSV/XLSX)
    - M1 Finance (CSV)
    - SoFi Invest (CSV)
    - Betterment (CSV)
    - Wealthfront (CSV)
    - T. Rowe Price (CSV/XLSX)
    - Generic CSV/XLSX formats
    
    HANDLES:
    - Multiple column naming conventions
    - Share-based and dollar-based values
    - Various date formats
    - Different encodings (UTF-8, Latin-1, CP1252)
    - Headers, footers, and metadata rows
    """
    
    try:
        # Check file type
        filename = file.filename or "unknown"
        file_ext = filename.lower().split('.')[-1]
        
        if file_ext not in ['csv', 'xlsx', 'xls']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type. Please upload CSV or XLSX file."
            )
        
        # Read file content
        content = await file.read()
        
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty"
            )
        
        # Check file size (max 10MB)
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size is 10MB."
            )
        
        # Parse file
        holdings = parse_portfolio_file(content, filename)
        
        logger.info(f"Successfully parsed file {filename}: {len(holdings)} holdings")
        
        return {
            "success": True,
            "filename": filename,
            "holdings": holdings,
            "count": len(holdings)
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"File parsing error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error parsing file: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while parsing the file. Please try again or enter holdings manually."
        )


@app.post("/api/analyze-portfolio", response_model=AnalyzePortfolioResponse)
@limiter.limit("10/hour")
def analyze_portfolio(request: Request, payload: AnalyzePortfolioRequest):
    """
    Analyze a portfolio using EdgeAI's OpenAI-powered intelligence
    
    Rate limited to 10 requests per IP per hour
    """
    
    try:
        logger.info(f"Received portfolio analysis request for client: {payload.client.name}")
        
        # Create the prompt for OpenAI
        prompt = create_analysis_prompt(payload.client, payload.holdings)
        
        # Call Anthropic API
        try:
            response = anthropic_client.messages.create(
                model="claude-3-5-haiku-20241022",  # Using Claude 3.5 Haiku for fast, cost-effective analysis
                max_tokens=4000,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7
            )
            
            # Extract text from Anthropic's response
            response_text = response.content[0].text
            
            # Parse the JSON response
            analysis_data = parse_openai_response(response_text)
            
            # Validate and return the response
            response = AnalyzePortfolioResponse(**analysis_data)
            
            logger.info(f"Successfully generated analysis for {payload.client.name}")
            return response
            
        except Exception as e:
            logger.error(f"Anthropic API error: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI service temporarily unavailable: {str(e)}"
            )
    
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid response format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your request"
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

