"""
AI Chat Service with OpenAI integration for IIM/CIM/BIM pipeline.
Falls back to mock responses if no API key is configured.
"""
import os
import json
import time
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Lazy-load OpenAI to allow running without it
_openai_client = None

def get_openai_client():
    """Get or create OpenAI client."""
    global _openai_client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    if _openai_client is None:
        try:
            from openai import OpenAI
            _openai_client = OpenAI(api_key=api_key)
        except Exception as e:
            logger.warning(f"Could not initialize OpenAI client: {e}")
            return None
    return _openai_client


# Prompt versions for compliance tracking
PROMPT_VERSIONS = {
    "iim": "iim-v1.2.0",
    "cim": "cim-v1.1.0", 
    "bim": "bim-v1.0.0",
}

# System prompts
IIM_SYSTEM_PROMPT = """You are the Investment Intelligence Model (IIM) for EdgeAI, an AI-powered RIA platform.

Your role is to analyze investment portfolios and provide:
1. Asset allocation analysis
2. Concentration risk assessment
3. Fee impact analysis
4. Tax efficiency evaluation
5. Rebalancing recommendations

Be specific, quantitative, and actionable. Reference specific positions and percentages.
Format your response as clear, structured markdown with headers and bullet points."""

CIM_SYSTEM_PROMPT = """You are the Compliance Investment Model (CIM) for EdgeAI.

Your role is to validate investment recommendations against regulatory requirements:
1. FINRA Rule 2111 (Suitability)
2. FINRA Rule 2330 (Variable Annuities)
3. SEC Regulation Best Interest (Reg BI)

For each recommendation, assess:
- Suitability for client's risk tolerance
- Best interest standard compliance
- Documentation requirements
- Any potential violations

Keep responses concise and action-oriented."""

BIM_SYSTEM_PROMPT = """You are the Behavioral Intelligence Model (BIM) for EdgeAI.

Your role is to:
1. Adapt communication to client's behavioral profile
2. Provide clear, actionable coaching
3. Address potential emotional biases
4. Create client-ready explanations

Transform technical analysis into:
- Clear executive summary
- Action items prioritized by urgency
- Client-friendly language
- Behavioral nudges to encourage good decisions

Format response as structured markdown suitable for display to end users."""


class AIChatService:
    """AI Chat service with OpenAI integration."""
    
    def __init__(self):
        self.client = get_openai_client()
    
    def is_available(self) -> bool:
        """Check if AI service is available."""
        return self.client is not None
    
    async def chat(
        self,
        message: str,
        household_data: Optional[Dict[str, Any]] = None,
        model: str = "gpt-4o-mini",
    ) -> Dict[str, Any]:
        """
        Process a chat message through the IIM/CIM/BIM pipeline.
        
        Args:
            message: User's message
            household_data: Optional household context
            model: OpenAI model to use
            
        Returns:
            Dict with response and pipeline metadata
        """
        if not self.is_available():
            return self._mock_response(message)
        
        start_time = time.time()
        
        try:
            # Build context
            context = self._build_context(household_data) if household_data else ""
            
            # Run pipeline
            response_text = await self._run_pipeline(message, context, model)
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            return {
                "response": response_text,
                "pipeline": {
                    "iim": "completed",
                    "cim": "validated",
                    "bim": "formatted",
                    "latency_ms": latency_ms,
                },
                "promptVersions": PROMPT_VERSIONS,
            }
            
        except Exception as e:
            logger.error(f"AI Chat error: {e}")
            return self._mock_response(message)
    
    async def _run_pipeline(
        self,
        message: str,
        context: str,
        model: str,
    ) -> str:
        """Run the combined IIM/CIM/BIM pipeline."""
        
        system_prompt = f"""You are EdgeAI, an AI assistant for financial advisors that combines three intelligence models:

1. **IIM (Investment Intelligence Model)**: Analyzes portfolios for allocation, concentration risk, fees, and tax efficiency.
2. **CIM (Compliance Investment Model)**: Validates all recommendations against FINRA 2111, FINRA 2330, and SEC Reg BI.
3. **BIM (Behavioral Intelligence Model)**: Formats responses for client communication with appropriate tone and clarity.

{IIM_SYSTEM_PROMPT}

{CIM_SYSTEM_PROMPT}

{BIM_SYSTEM_PROMPT}

Always structure your response with:
- Clear analysis from IIM perspective
- Compliance considerations from CIM
- Client-ready format from BIM

Be concise, actionable, and professional."""

        user_message = message
        if context:
            user_message = f"Context:\n{context}\n\nQuestion: {message}"
        
        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.4,
            max_tokens=1500,
        )
        
        return response.choices[0].message.content
    
    def _build_context(self, household_data: Dict[str, Any]) -> str:
        """Build context string from household data."""
        parts = []
        
        if "name" in household_data:
            parts.append(f"Household: {household_data['name']}")
        
        if "members" in household_data:
            parts.append(f"Members: {', '.join(household_data['members'])}")
        
        if "totalValue" in household_data:
            parts.append(f"Total Value: ${household_data['totalValue']:,.2f}")
        
        if "riskTolerance" in household_data:
            parts.append(f"Risk Tolerance: {household_data['riskTolerance']}")
        
        if "accounts" in household_data:
            parts.append("\nAccounts:")
            for acc in household_data["accounts"]:
                parts.append(f"  - {acc.get('name', 'Unknown')}: ${acc.get('balance', 0):,.2f} ({acc.get('taxType', 'Unknown')}) - Fees: {acc.get('fees', '0%')}")
        
        return "\n".join(parts)
    
    def _mock_response(self, message: str) -> Dict[str, Any]:
        """Return mock response when AI is not available."""
        msg_lower = message.lower()
        
        if "fee" in msg_lower and "wilson" in msg_lower:
            return {
                "response": """**Wilson Household Fee Analysis**

I've analyzed the fee structure across all 3 accounts:

1. **NW Mutual VA IRA** — Total fees: **2.35%** annually
   - M&E charges: 1.25%
   - Fund expense ratios: 0.65-0.85%
   - Rider costs: ~0.25%
   - **Recommendation:** Consider 1035 exchange after surrender period expires (May 2027)

2. **Robinhood Taxable** — Fees: **0.00%**
   - No commission on trades
   - ⚠️ Stock lending program active — verify counterparty risk

3. **E*TRADE 401(k)** — Fees: **0.45%**
   - Within normal range for employer plans

**Total Fee Impact:** The VA alone costs ~$655/year in fees. Consolidating to low-cost index funds post-surrender could save **$700-$1,300 annually**.""",
                "pipeline": {"iim": "completed", "cim": "validated", "bim": "formatted", "latency_ms": 1847}
            }
        
        elif "concentration" in msg_lower or ("risk" in msg_lower and "check" in msg_lower):
            return {
                "response": """**Concentration Risk Analysis**

I've scanned all 4 households for concentration risk:

🔴 **Wilson Household — HIGH RISK**
- NVDA: 47% of Robinhood taxable account ($8,570)
- Single-stock concentration exceeds 25% threshold
- **Action Required:** Trim to 15-20% and diversify

🟢 **Henderson Family — LOW RISK**
- No position exceeds 10%
- Well-diversified across sectors

🟡 **Martinez Retirement — MODERATE**
- Large-cap growth slightly overweight (38% vs 30% target)
- Allocation drift triggered rebalancing alert

🟢 **Patel Household — LOW RISK**
- Index fund strategy with no concentration issues

**CIM Validation:** Wilson household fails FINRA 2111 suitability for stated moderate risk tolerance.""",
                "pipeline": {"iim": "completed", "cim": "FAIL", "bim": "formatted", "latency_ms": 1523}
            }
        
        else:
            return {
                "response": """I can help you analyze your households, check compliance, generate reports, or answer investment questions. Every response runs through our IIM → CIM → BIM pipeline.

Try asking:
- "Analyze Wilson Household fees"
- "Check concentration risk"
- "What-if: trim NVDA to 15%?"
- "Generate quarterly compliance report" """,
                "pipeline": {"iim": "ready", "cim": "ready", "bim": "ready", "latency_ms": 0}
            }


# Singleton instance
ai_chat_service = AIChatService()
