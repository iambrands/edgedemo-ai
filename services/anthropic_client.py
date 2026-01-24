"""
Anthropic Claude Haiku client for option analysis
Using Haiku for cost efficiency: $0.25/$1.25 per 1M tokens (14x cheaper than GPT-4o)
"""

import os
import json
import logging
import time
from anthropic import Anthropic
from typing import List, Dict, Any, Optional

# Import profiling if available
try:
    from middleware.profiling import PerformanceMonitor, track_api_call
    PROFILING_ENABLED = True
except ImportError:
    PROFILING_ENABLED = False

logger = logging.getLogger(__name__)

class AnthropicClient:
    """Wrapper for Anthropic Claude API with Haiku model"""
    
    def __init__(self):
        self.api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not self.api_key:
            logger.warning("ANTHROPIC_API_KEY not set - Anthropic features will be disabled")
            self.client = None
            self.model = None
            return
        
        try:
            self.client = Anthropic(api_key=self.api_key)
            # Use latest Haiku model (claude-3-5-haiku-20241022 or claude-3-haiku-20240307)
            self.model = "claude-3-5-haiku-20241022"
            logger.info(f"✅ Anthropic client initialized with {self.model}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Anthropic client: {e}")
            self.client = None
            self.model = None
    
    def is_available(self) -> bool:
        """Check if Anthropic client is available"""
        return self.client is not None and self.api_key is not None
    
    def analyze_option(self, option_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a single option and return scoring
        
        Args:
            option_data: Dict with option details (strike, premium, greeks, etc)
        
        Returns:
            Dict with risk_score, confidence, reasoning
        """
        if not self.is_available():
            return self._default_response("Anthropic API not configured")
        
        start_time = time.time()
        
        try:
            prompt = self._build_option_prompt(option_data)
            
            response = self.client.messages.create(
                model=self.model,
                max_tokens=512,  # Keep short for speed
                temperature=0.3,  # Lower temp for consistent scoring
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            # Calculate duration and cost
            duration_ms = (time.time() - start_time) * 1000
            prompt_tokens = response.usage.input_tokens
            completion_tokens = response.usage.output_tokens
            
            # Haiku pricing: $0.25 per 1M input, $1.25 per 1M output
            cost = (prompt_tokens * 0.25 + completion_tokens * 1.25) / 1_000_000
            
            # Track API call for profiling
            if PROFILING_ENABLED:
                track_api_call(
                    service='claude',
                    duration_ms=duration_ms,
                    cost=cost,
                    metadata={
                        'model': self.model,
                        'method': 'analyze_option',
                        'prompt_tokens': prompt_tokens,
                        'completion_tokens': completion_tokens
                    }
                )
            
            logger.info(f"Claude analyze_option: {duration_ms:.0f}ms, ${cost:.6f}, tokens={prompt_tokens}+{completion_tokens}")
            
            # Parse response
            result = self._parse_response(response.content[0].text)
            
            logger.debug(f"✅ Analyzed {option_data.get('symbol', 'option')}: score={result.get('risk_score')}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Anthropic API error: {e}")
            # Return safe defaults on error
            return self._default_response(f"Analysis failed: {str(e)}")
    
    def analyze_options_batch(self, options: List[Dict[str, Any]], limit: int = 50) -> List[Dict[str, Any]]:
        """
        Analyze multiple options in a single API call (more efficient)
        
        Args:
            options: List of option data dicts
            limit: Max options to analyze in one batch (default 50)
        
        Returns:
            List of analysis results in same order as input
        """
        if not self.is_available():
            return [self._default_response("Anthropic API not configured") for _ in options[:limit]]
        
        if not options:
            return []
        
        # Limit batch size
        options = options[:limit]
        start_time = time.time()
        
        try:
            prompt = self._build_batch_prompt(options)
            
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,  # Larger for batch results
                temperature=0.3,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            # Calculate duration and cost
            duration_ms = (time.time() - start_time) * 1000
            prompt_tokens = response.usage.input_tokens
            completion_tokens = response.usage.output_tokens
            
            # Haiku pricing: $0.25 per 1M input, $1.25 per 1M output
            cost = (prompt_tokens * 0.25 + completion_tokens * 1.25) / 1_000_000
            
            # Track API call for profiling
            if PROFILING_ENABLED:
                track_api_call(
                    service='claude',
                    duration_ms=duration_ms,
                    cost=cost,
                    metadata={
                        'model': self.model,
                        'method': 'analyze_options_batch',
                        'batch_size': len(options),
                        'prompt_tokens': prompt_tokens,
                        'completion_tokens': completion_tokens
                    }
                )
            
            logger.info(f"Claude batch analyze: {duration_ms:.0f}ms, ${cost:.6f}, batch={len(options)}, tokens={prompt_tokens}+{completion_tokens}")
            
            # Parse batch response
            results = self._parse_batch_response(response.content[0].text, len(options))
            
            logger.info(f"✅ Batch analyzed {len(results)} options")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Batch analysis error: {e}")
            # Return safe defaults for all options
            return [self._default_response(f"Batch analysis failed: {str(e)}") for _ in options]
    
    def generate_analysis_text(self, option: Dict, stock_price: float, greeks: Dict, 
                              days_to_expiration: int, user_risk_tolerance: str = 'moderate') -> Optional[str]:
        """
        Generate comprehensive plain English analysis text (for detailed option analysis)
        
        Args:
            option: Option data dict
            stock_price: Current stock price
            greeks: Dict with delta, gamma, theta, vega, iv
            days_to_expiration: Days until expiration
            user_risk_tolerance: User's risk tolerance level
        
        Returns:
            Plain English analysis text or None
        """
        if not self.is_available():
            return None
        
        start_time = time.time()
        
        try:
            prompt = self._build_detailed_analysis_prompt(
                option, stock_price, greeks, days_to_expiration, user_risk_tolerance
            )
            
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                temperature=0.5,  # Slightly higher for more natural language
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            # Calculate duration and cost
            duration_ms = (time.time() - start_time) * 1000
            prompt_tokens = response.usage.input_tokens
            completion_tokens = response.usage.output_tokens
            
            # Haiku pricing
            cost = (prompt_tokens * 0.25 + completion_tokens * 1.25) / 1_000_000
            
            # Track API call for profiling
            if PROFILING_ENABLED:
                track_api_call(
                    service='claude',
                    duration_ms=duration_ms,
                    cost=cost,
                    metadata={
                        'model': self.model,
                        'method': 'generate_analysis_text',
                        'prompt_tokens': prompt_tokens,
                        'completion_tokens': completion_tokens
                    }
                )
            
            logger.info(f"Claude generate_analysis_text: {duration_ms:.0f}ms, ${cost:.6f}")
            
            return response.content[0].text.strip()
            
        except Exception as e:
            logger.error(f"❌ Failed to generate analysis text: {e}")
            return None
    
    def _build_option_prompt(self, option: Dict[str, Any]) -> str:
        """Build prompt for single option analysis"""
        underlying = option.get('underlying') or option.get('symbol', 'N/A')
        option_type = option.get('option_type') or option.get('type', 'N/A')
        strike = option.get('strike', 0)
        last = option.get('last', 0) or option.get('mid_price', 0)
        bid = option.get('bid', 0)
        ask = option.get('ask', 0)
        volume = option.get('volume', 0)
        open_interest = option.get('open_interest', 0)
        greeks = option.get('greeks', {})
        iv = greeks.get('mid_iv', 0) or greeks.get('iv', 0)
        delta = greeks.get('delta', 0)
        days_to_exp = option.get('days_to_exp', 0) or option.get('days_to_expiration', 0)
        
        return f"""You are an expert options trader. Analyze this option and provide a brief assessment.

Option Details:
- Symbol: {underlying}
- Type: {option_type.upper()}
- Strike: ${strike:.2f}
- Current Price: ${last:.2f}
- Bid/Ask: ${bid:.2f} / ${ask:.2f}
- Volume: {volume:,}
- Open Interest: {open_interest:,}
- IV: {iv * 100:.1f}%
- Delta: {delta:.3f}
- Days to Expiration: {days_to_exp}

Respond with ONLY a JSON object (no markdown, no explanation):
{{
  "risk_score": <1-10, where 1=very risky, 10=very safe>,
  "confidence": <1-10, how confident are you in this assessment>,
  "reasoning": "<brief 1-sentence explanation>"
}}"""
    
    def _build_batch_prompt(self, options: List[Dict[str, Any]]) -> str:
        """Build prompt for batch option analysis"""
        options_text = "\n\n".join([
            f"""Option {i+1}:
- Symbol: {opt.get('underlying') or opt.get('symbol', 'N/A')}
- Type: {(opt.get('option_type') or opt.get('type', 'N/A')).upper()}
- Strike: ${opt.get('strike', 0):.2f}
- Price: ${opt.get('last', 0) or opt.get('mid_price', 0):.2f}
- Volume: {opt.get('volume', 0):,}
- IV: {(opt.get('greeks', {}).get('mid_iv', 0) or opt.get('greeks', {}).get('iv', 0)) * 100:.1f}%
- Delta: {opt.get('greeks', {}).get('delta', 0):.3f}"""
            for i, opt in enumerate(options)
        ])
        
        return f"""You are an expert options trader. Analyze these {len(options)} options and score each one.

{options_text}

Respond with ONLY a JSON array (no markdown, no explanation):
[
  {{"option_index": 1, "risk_score": <1-10>, "confidence": <1-10>, "reasoning": "<brief>"}},
  {{"option_index": 2, "risk_score": <1-10>, "confidence": <1-10>, "reasoning": "<brief>"}},
  ...
]"""
    
    def _build_detailed_analysis_prompt(self, option: Dict, stock_price: float, 
                                       greeks: Dict, days_to_expiration: int,
                                       user_risk_tolerance: str) -> str:
        """Build prompt for detailed plain English analysis"""
        contract_type = option.get('type', '').lower() or option.get('option_type', '').lower()
        strike = float(option.get('strike', 0))
        mid_price = option.get('mid_price', 0) or option.get('last', 0)
        volume = int(option.get('volume', 0))
        open_interest = int(option.get('open_interest', 0))
        delta = greeks.get('delta', 0)
        gamma = greeks.get('gamma', 0)
        theta = greeks.get('theta', 0)
        vega = greeks.get('vega', 0)
        iv = greeks.get('iv', 0) or greeks.get('mid_iv', 0)
        
        return f"""You are an expert options trading analyst. Analyze this option trade and provide a comprehensive, easy-to-understand analysis.

Option Details:
- Symbol: {option.get('symbol', 'N/A')}
- Type: {contract_type.upper()}
- Strike: ${strike:.2f}
- Current Stock Price: ${stock_price:.2f}
- Premium (Mid Price): ${mid_price:.2f}
- Days to Expiration: {days_to_expiration}
- Volume: {volume}
- Open Interest: {open_interest}

Greeks:
- Delta: {delta:.4f}
- Gamma: {gamma:.4f}
- Theta: {theta:.4f}
- Vega: {vega:.4f}
- Implied Volatility: {iv*100:.2f}%

User Risk Tolerance: {user_risk_tolerance}

Provide a comprehensive analysis in plain English covering:
1. Overall recommendation (Buy/Consider/Avoid)
2. Risk assessment
3. Profit potential
4. Key risks to watch
5. Suitability for the user's risk tolerance

Be concise but informative (2-3 paragraphs max)."""
    
    def _parse_response(self, text: str) -> Dict[str, Any]:
        """Parse single option response"""
        try:
            # Remove markdown code blocks if present
            text = text.replace('```json', '').replace('```', '').strip()
            
            result = json.loads(text)
            
            # Validate required fields
            if 'risk_score' not in result or 'confidence' not in result:
                raise ValueError("Missing required fields")
            
            # Ensure scores are in valid range
            result['risk_score'] = max(1, min(10, int(result.get('risk_score', 5))))
            result['confidence'] = max(1, min(10, int(result.get('confidence', 5))))
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to parse response: {text[:100]}")
            return self._default_response(f"Parse error: {str(e)}")
    
    def _parse_batch_response(self, text: str, expected_count: int) -> List[Dict[str, Any]]:
        """Parse batch analysis response"""
        try:
            # Remove markdown code blocks if present
            text = text.replace('```json', '').replace('```', '').strip()
            
            results = json.loads(text)
            
            # Ensure we have a list
            if not isinstance(results, list):
                raise ValueError("Expected array response")
            
            # Validate and normalize each result
            for result in results:
                if 'risk_score' in result:
                    result['risk_score'] = max(1, min(10, int(result.get('risk_score', 5))))
                if 'confidence' in result:
                    result['confidence'] = max(1, min(10, int(result.get('confidence', 5))))
            
            # Pad with defaults if needed
            while len(results) < expected_count:
                results.append({
                    'option_index': len(results) + 1,
                    'risk_score': 5,
                    'confidence': 5,
                    'reasoning': 'Missing from batch'
                })
            
            return results[:expected_count]
            
        except Exception as e:
            logger.error(f"Failed to parse batch response: {text[:200]}")
            # Return safe defaults for all
            return [self._default_response(f"Batch parse error: {str(e)}") for _ in range(expected_count)]
    
    def _default_response(self, error_msg: str = "Analysis unavailable") -> Dict[str, Any]:
        """Return default safe response"""
        return {
            'risk_score': 5,
            'confidence': 5,
            'reasoning': error_msg,
            'error': error_msg
        }

# Create singleton instance (will be initialized on first import)
_anthropic_client = None

def get_anthropic_client() -> AnthropicClient:
    """Get or create Anthropic client singleton"""
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = AnthropicClient()
    return _anthropic_client

