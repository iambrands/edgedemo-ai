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

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from openai import OpenAI
import logging

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

# Initialize OpenAI client
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")

openai_client = OpenAI(api_key=OPENAI_API_KEY)


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


class AnalyzePortfolioResponse(BaseModel):
    portfolioHealth: PortfolioHealth
    taxOptimization: TaxOptimization
    rebalancing: Rebalancing
    retirementReadiness: RetirementReadiness
    compliance: Compliance
    behavioralCoaching: BehavioralCoaching


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
        
        # Call OpenAI API
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",  # Using GPT-4o-mini for fast, cost-effective analysis
                max_tokens=4000,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7
            )
            
            # Extract text from OpenAI's response
            response_text = response.choices[0].message.content
            
            # Parse the JSON response
            analysis_data = parse_openai_response(response_text)
            
            # Validate and return the response
            response = AnalyzePortfolioResponse(**analysis_data)
            
            logger.info(f"Successfully generated analysis for {payload.client.name}")
            return response
            
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}", exc_info=True)
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

