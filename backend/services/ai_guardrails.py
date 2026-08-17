"""Shared prompt guardrails for advisor-facing AI features."""

from __future__ import annotations


BASE_GUARDRAILS = (
    "Compliance guardrails:\n"
    "- Treat outputs as educational analysis and suggestions, not investment advice.\n"
    "- Do not guarantee performance or promise specific returns.\n"
    "- Do not fabricate account data, legal conclusions, or regulatory outcomes.\n"
    "- Flag uncertainty clearly and recommend advisor review before client delivery.\n"
    "- Keep recommendations suitability-aware and risk-profile-aware.\n"
)


def apply_compliance_guardrails(prompt: str, *, audience: str = "advisor") -> str:
    """Append standard compliance constraints to an AI prompt."""
    audience_line = (
        "Audience context: Output is for internal advisor workflow and must remain "
        "review-ready before any client communication."
        if audience == "advisor"
        else "Audience context: Output is for internal review and must avoid direct advice."
    )
    return f"{prompt}\n\n{BASE_GUARDRAILS}{audience_line}\n"
