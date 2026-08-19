"""
B2C AI Analysis Service — real OpenAI gpt-4o-mini portfolio analysis.

Replaces string-template narratives with actual AI-generated insights
personalized to the user's portfolio, spending, goals, and tax situation.

Falls back gracefully to deterministic templates when OpenAI is unavailable.
Redis cache (30-min TTL) prevents per-request API calls.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

_MODEL = "gpt-4o-mini"
_CACHE_TTL = 1800  # 30 minutes


def _get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=api_key, timeout=15.0)
    except Exception as e:
        logger.warning("OpenAI init failed: %s", e)
        return None


def _get_redis():
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        import redis as redislib
        r = redislib.Redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
        r.ping()
        return r
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_prompt(ctx: dict[str, Any]) -> str:
    nw = ctx.get("net_worth", 0)
    nw_change = ctx.get("net_worth_change", 0)
    nw_change_pct = ctx.get("net_worth_change_pct", 0)
    invested = ctx.get("total_invested", 0)
    cash = ctx.get("cash_reserves", 0)
    fee_rate = ctx.get("effective_fee_rate_pct", "0.50")
    fee_annual = ctx.get("annual_fees", 0)
    fee_savings = ctx.get("potential_savings", 0)
    tlh_count = ctx.get("tlh_opportunities", 0)
    tlh_savings = ctx.get("tlh_estimated_savings", 0)
    goals = ctx.get("goals", [])
    allocation = ctx.get("allocation", [])
    risk_label = ctx.get("risk_label", "Moderate growth")
    spending_top = ctx.get("spending_top_category", "")
    spending_change = ctx.get("spending_top_change_pct", 0)
    retirement_years = ctx.get("years_to_retirement", 3)

    goals_text = ""
    for g in goals[:3]:
        goals_text += f"  - {g.get('name')}: {g.get('progress_pct', 0):.0f}% of ${g.get('target_amount', 0):,.0f} target\n"

    alloc_text = ""
    for a in allocation[:4]:
        alloc_text += f"  - {a.get('asset_class')}: {a.get('pct')}%\n"

    return f"""You are a financial wellness assistant for Firmum, a planning platform for self-directed investors.

The client is a pre-retiree planning to retire in approximately {retirement_years} years.
Risk profile: {risk_label}

CURRENT PORTFOLIO SNAPSHOT:
- Net worth: ${nw:,.0f} ({"+" if nw_change >= 0 else ""}{nw_change_pct:.1f}%, ${abs(nw_change):,.0f} {"gain" if nw_change >= 0 else "loss"} over 12 months)
- Invested assets: ${invested:,.0f}
- Cash reserves: ${cash:,.0f}
- Annual fees (estimated): ${fee_annual:,.0f}/yr at {fee_rate}% effective rate
- Potential fee savings vs. traditional 1% advisor: ${fee_savings:,.0f}/yr

ASSET ALLOCATION:
{alloc_text.strip()}

GOALS:
{goals_text.strip()}

TAX SITUATION:
- Tax-loss harvesting opportunities: {tlh_count} positions
- Estimated TLH savings available: ${tlh_savings:,.0f}

SPENDING (last 30 days):
- Top overspend category: {spending_top} ({("+" if spending_change >= 0 else "") + str(spending_change)}% vs last month)

TASK:
Return ONLY a valid JSON object — no markdown, no code blocks, no explanation. Use this exact schema:

{{
  "narrative": "<2-3 sentences. Reference specific dollar amounts and percentages from the data. Be concrete and personal. Do NOT give investment advice. Mention the biggest win and the top opportunity.>",
  "insights": [
    {{
      "type": "goal_progress|fee_savings|allocation_drift|tax_opportunity|spending_alert",
      "title": "<8 words max>",
      "detail": "<1-2 sentences, specific numbers, no investment advice>",
      "priority": "high|medium|low",
      "action_label": "<3-4 words>",
      "action_route": "retirement|fee-analyzer|allocation|tax|spending"
    }}
  ]
}}

Produce exactly 3-4 insights ranked by priority. Be specific — cite actual numbers from the data above."""


# ---------------------------------------------------------------------------
# Fallback templates (when OpenAI unavailable)
# ---------------------------------------------------------------------------

def _fallback_analysis(ctx: dict[str, Any]) -> dict[str, Any]:
    nw_change = ctx.get("net_worth_change", 880000)
    nw_change_pct = ctx.get("net_worth_change_pct", 21.4)
    fee_savings = ctx.get("potential_savings", 12500)
    tlh_count = ctx.get("tlh_opportunities", 4)
    tlh_savings = ctx.get("tlh_estimated_savings", 12400)
    goals = ctx.get("goals", [])
    retirement_goal = next((g for g in goals if "retire" in g.get("name", "").lower()), None)
    retire_pct = retirement_goal.get("progress_pct", 94) if retirement_goal else 94

    return {
        "narrative": (
            f"Your net worth grew by ${nw_change:,.0f} ({nw_change_pct:.1f}%) over the past 12 months. "
            f"Your fee analyzer identified ${fee_savings:,.0f}/year in potential savings vs. a traditional advisor. "
            f"{tlh_count} tax-loss harvesting opportunities could save ~${tlh_savings:,.0f} this year."
        ),
        "insights": [
            {
                "type": "goal_progress",
                "title": f"On track to retire in ~{ctx.get('years_to_retirement', 3)} years",
                "detail": (
                    f"With ${ctx.get('total_invested', 4700000):,.0f} invested and "
                    f"${ctx.get('cash_reserves', 300000):,.0f} in cash, your portfolio is "
                    f"{retire_pct:.0f}% of your retirement target. Review your withdrawal glide path."
                ),
                "priority": "high",
                "action_label": "View retirement plan",
                "action_route": "retirement",
            },
            {
                "type": "fee_savings",
                "title": f"Save ~${fee_savings:,.0f}/yr in investment fees",
                "detail": (
                    f"Your estimated fee rate ({ctx.get('effective_fee_rate_pct', '0.50')}%) vs a "
                    f"traditional 1% advisor on ${ctx.get('total_invested', 4700000):,.0f} could free "
                    "significant cash for retirement spending."
                ),
                "priority": "medium",
                "action_label": "View fee analyzer",
                "action_route": "fee-analyzer",
            },
            {
                "type": "tax_opportunity",
                "title": f"{tlh_count} tax-loss harvesting opportunities",
                "detail": (
                    f"Estimated tax savings of ${tlh_savings:,.0f} available from harvesting "
                    "losses in your taxable brokerage before year-end."
                ),
                "priority": "medium",
                "action_label": "View tax summary",
                "action_route": "tax",
            },
            {
                "type": "allocation_drift",
                "title": "US equity above growth target",
                "detail": (
                    "Your Schwab portfolio is overweight US equities ahead of retirement. "
                    "Consider trimming winners and adding to fixed income."
                ),
                "priority": "low",
                "action_label": "Review allocation",
                "action_route": "allocation",
            },
        ],
        "model": "fallback",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def generate_portfolio_analysis(
    user_id: str,
    portfolio_ctx: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate AI-powered portfolio analysis for a B2C user.

    Checks Redis cache first. On cache miss, calls OpenAI gpt-4o-mini
    with structured portfolio context. Falls back to deterministic templates
    if OpenAI is unavailable or times out.

    Returns a dict with: narrative (str), insights (list), model (str), generated_at (str).
    """
    cache_key = f"b2c:ai_analysis:{user_id}"
    redis = _get_redis()

    # Cache hit
    if redis:
        try:
            cached = redis.get(cache_key)
            if cached:
                data = json.loads(cached)
                data["cached"] = True
                return data
        except Exception as e:
            logger.debug("Redis cache read failed: %s", e)

    client = _get_openai_client()
    if not client:
        logger.info("OpenAI not configured — using fallback analysis for user %s", user_id)
        result = _fallback_analysis(portfolio_ctx)
        result["cached"] = False
        return result

    prompt = _build_prompt(portfolio_ctx)

    try:
        response = client.chat.completions.create(
            model=_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a financial wellness assistant. "
                        "You produce only valid JSON. "
                        "Never give specific investment advice. "
                        "Always include a disclaimer-level framing in narrative."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=600,
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)

        # Validate basic structure
        if "narrative" not in data or "insights" not in data:
            raise ValueError("Missing required keys in OpenAI response")

        result = {
            "narrative": data["narrative"],
            "insights": data["insights"][:4],
            "model": _MODEL,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "cached": False,
        }

        # Write to cache
        if redis:
            try:
                redis.setex(cache_key, _CACHE_TTL, json.dumps(result))
            except Exception as e:
                logger.debug("Redis cache write failed: %s", e)

        return result

    except Exception as e:
        logger.error("OpenAI analysis failed for user %s: %s", user_id, e)
        result = _fallback_analysis(portfolio_ctx)
        result["cached"] = False
        return result
