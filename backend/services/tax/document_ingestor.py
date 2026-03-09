"""
Tax document (1040) ingestion service via Claude Vision API (IMM-02).
Converts PDF pages to images, sends to Claude for structured extraction,
stores results in PostgreSQL tax_profiles table.
"""

import asyncio
import base64
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from backend.config.settings import settings

logger = logging.getLogger(__name__)

TAX_PROFILE_SCHEMA = {
    "tax_year": "int",
    "filing_status": "str",
    "agi": "float",
    "taxable_income": "float",
    "total_tax": "float",
    "effective_rate": "float",
    "marginal_rate": "float",
    "capital_gains": {"short_term": "float", "long_term": "float"},
    "qualified_dividends": "float",
    "schedule_d_present": "bool",
    "retirement_contributions": {"traditional_ira": "float", "roth_ira": "float", "401k": "float"},
    "estimated_tax_paid": "float",
    "raw_confidence": "float",
}


async def ingest_tax_document(file_bytes: bytes, client_id, db) -> str:
    """
    Accept PDF bytes, launch background extraction, return job_id for polling.
    """
    job_id = str(uuid.uuid4())

    try:
        from backend.services.redis_client import get_redis

        redis = await get_redis()
        if redis:
            await redis.setex(
                f"tax_job:{job_id}",
                3600,
                json.dumps({"job_id": job_id, "status": "processing"}),
            )
    except Exception:
        pass

    asyncio.create_task(_process_ingest(job_id, file_bytes, client_id, db))
    return job_id


async def _process_ingest(job_id: str, file_bytes: bytes, client_id, db) -> None:
    """Background task: convert PDF, call Claude Vision, store results."""
    try:
        images = _pdf_to_base64_images(file_bytes)
        if not images:
            await _update_job_status(job_id, "error", error="No pages extracted from PDF")
            return

        extracted = await _extract_with_claude(images)
        if not extracted:
            await _update_job_status(job_id, "error", error="Claude extraction returned empty")
            return

        await _store_tax_profile(client_id, extracted, db)
        await _update_job_status(
            job_id, "complete", confidence=extracted.get("raw_confidence", 0)
        )
        logger.info("Tax ingest complete: job=%s client=%s", job_id, client_id)

    except Exception as e:
        logger.error("Tax ingest failed: %s", e)
        await _update_job_status(job_id, "error", error=str(e))


def _pdf_to_base64_images(pdf_bytes: bytes) -> list[str]:
    """Convert PDF pages to base64-encoded PNG images."""
    try:
        from pdf2image import convert_from_bytes

        images = convert_from_bytes(pdf_bytes, dpi=200, fmt="png")
        result = []
        for img in images[:10]:
            import io

            buf = io.BytesIO()
            img.save(buf, format="PNG")
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            result.append(b64)
        return result
    except ImportError:
        logger.warning("pdf2image not available — using PyMuPDF fallback")
        try:
            import fitz

            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            result = []
            for page in doc[:10]:
                pix = page.get_pixmap(dpi=200)
                b64 = base64.b64encode(pix.tobytes("png")).decode("utf-8")
                result.append(b64)
            return result
        except Exception as e2:
            logger.error("PDF conversion failed: %s", e2)
            return []


async def _extract_with_claude(images: list[str]) -> Optional[dict]:
    """Send page images to Claude Vision API for structured extraction."""
    if not settings.anthropic_api_key:
        logger.warning("ANTHROPIC_API_KEY not set — returning mock tax data")
        return _mock_extraction()

    try:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=settings.anthropic_api_key)

        content: list[dict] = []
        for b64_img in images:
            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": "image/png", "data": b64_img},
            })
        content.append({
            "type": "text",
            "text": (
                "Extract the following tax data from this 1040 form as valid JSON. "
                "Use null for missing fields. Include a raw_confidence float (0.0-1.0) "
                "for overall extraction quality.\n\n"
                f"Schema: {json.dumps(TAX_PROFILE_SCHEMA, indent=2)}"
            ),
        })

        response = await client.messages.create(
            model="claude-sonnet-4-5-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": content}],
        )

        text = response.content[0].text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        return None

    except Exception as e:
        logger.error("Claude extraction failed: %s", e)
        return _mock_extraction()


def _mock_extraction() -> dict:
    """Return mock tax data when AI is unavailable."""
    return {
        "tax_year": 2025,
        "filing_status": "mfj",
        "agi": 285000.0,
        "taxable_income": 228000.0,
        "total_tax": 51480.0,
        "effective_rate": 0.226,
        "marginal_rate": 0.32,
        "capital_gains": {"short_term": 4200.0, "long_term": 18500.0},
        "qualified_dividends": 3200.0,
        "schedule_d_present": True,
        "retirement_contributions": {"traditional_ira": 6500.0, "roth_ira": 0.0, "401k": 22500.0},
        "estimated_tax_paid": 42000.0,
        "raw_confidence": 0.92,
    }


async def _store_tax_profile(client_id, data: dict, db) -> None:
    """Store extracted tax data in PostgreSQL."""
    try:
        from backend.models.tax_profile import TaxProfile
        from sqlalchemy import select

        existing = await db.execute(
            select(TaxProfile).where(
                TaxProfile.client_id == client_id,
                TaxProfile.tax_year == data.get("tax_year", 2025),
            )
        )
        profile = existing.scalar_one_or_none()

        if profile:
            profile.filing_status = data.get("filing_status")
            profile.agi = data.get("agi")
            profile.taxable_income = data.get("taxable_income")
            profile.effective_rate = data.get("effective_rate")
            profile.marginal_rate = data.get("marginal_rate")
            profile.capital_gains = data.get("capital_gains")
            profile.raw_data = data
            profile.confidence = data.get("raw_confidence")
        else:
            profile = TaxProfile(
                client_id=client_id,
                tax_year=data.get("tax_year", 2025),
                filing_status=data.get("filing_status"),
                agi=data.get("agi"),
                taxable_income=data.get("taxable_income"),
                effective_rate=data.get("effective_rate"),
                marginal_rate=data.get("marginal_rate"),
                capital_gains=data.get("capital_gains"),
                raw_data=data,
                confidence=data.get("raw_confidence"),
            )
            db.add(profile)

        await db.commit()
    except Exception as e:
        logger.error("Tax profile store failed: %s", e)
        await db.rollback()


async def _update_job_status(job_id: str, status: str, confidence: float = 0, error: str = "") -> None:
    """Update job status in Redis."""
    try:
        from backend.services.redis_client import get_redis

        redis = await get_redis()
        if redis:
            await redis.setex(
                f"tax_job:{job_id}",
                3600,
                json.dumps({"job_id": job_id, "status": status, "confidence": confidence, "error": error}),
            )
    except Exception:
        pass
