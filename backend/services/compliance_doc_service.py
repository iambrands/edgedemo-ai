"""
Compliance Document Generation Service.
AI-powered generation for ADV Part 2B, Form CRS, and other regulatory documents.
"""

import hashlib
import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

import anthropic
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.compliance_docs import (
    ADVPart2BData,
    ComplianceDocument,
    ComplianceDocumentVersion,
    DocumentStatus,
    DocumentTemplate,
    DocumentType,
    FormCRSData,
)

logger = logging.getLogger(__name__)


class ComplianceDocService:
    """Service for generating and managing compliance documents."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    # ==================== ADV PART 2B ====================

    async def generate_adv_part_2b(
        self,
        advisor_id: UUID,
        firm_id: UUID,
        created_by: UUID,
        regenerate: bool = False,
    ) -> ComplianceDocumentVersion:
        """Generate ADV Part 2B (Brochure Supplement) for an advisor."""

        # Get advisor data
        result = await self.db.execute(
            select(ADVPart2BData).where(ADVPart2BData.advisor_id == advisor_id)
        )
        adv_data = result.scalar_one_or_none()

        if not adv_data:
            raise ValueError(f"No ADV Part 2B data found for advisor {advisor_id}")

        # Get or create document
        result = await self.db.execute(
            select(ComplianceDocument).where(
                ComplianceDocument.firm_id == firm_id,
                ComplianceDocument.document_type == DocumentType.ADV_PART_2B,
                ComplianceDocument.title.contains(adv_data.full_name),
            )
        )
        document = result.scalar_one_or_none()

        if not document:
            document = ComplianceDocument(
                firm_id=firm_id,
                document_type=DocumentType.ADV_PART_2B,
                title=f"ADV Part 2B - {adv_data.full_name}",
                description=f"Brochure Supplement for {adv_data.full_name}",
                status=DocumentStatus.DRAFT,
                created_by=created_by,
            )
            self.db.add(document)
            await self.db.flush()

        # Prepare generation inputs
        generation_inputs = self._prepare_adv_2b_inputs(adv_data)

        # Generate content sections using AI
        content_json = await self._generate_adv_2b_content(generation_inputs)

        # Render HTML
        content_html = self._render_adv_2b_html(content_json, adv_data)

        # Calculate version number
        result = await self.db.execute(
            select(ComplianceDocumentVersion)
            .where(ComplianceDocumentVersion.document_id == document.id)
            .order_by(desc(ComplianceDocumentVersion.version_number))
            .limit(1)
        )
        latest_version = result.scalar_one_or_none()

        version_number = (latest_version.version_number + 1) if latest_version else 1

        # Create new version
        prompt_hash = hashlib.sha256(
            json.dumps(generation_inputs, sort_keys=True).encode()
        ).hexdigest()[:16]

        version = ComplianceDocumentVersion(
            document_id=document.id,
            version_number=version_number,
            content_json=content_json,
            content_html=content_html,
            ai_generated=True,
            ai_model="claude-sonnet-4-20250514",
            ai_prompt_hash=prompt_hash,
            generation_inputs=generation_inputs,
            status=DocumentStatus.DRAFT,
            created_by=created_by,
        )
        self.db.add(version)
        await self.db.flush()

        # Update document's current version
        document.current_version_id = version.id

        await self.db.commit()
        await self.db.refresh(version)

        logger.info(
            f"Generated ADV Part 2B v{version_number} for advisor {advisor_id}"
        )
        return version

    def _prepare_adv_2b_inputs(self, adv_data: ADVPart2BData) -> Dict[str, Any]:
        """Prepare structured inputs for ADV Part 2B generation."""
        return {
            "full_name": adv_data.full_name,
            "crd_number": adv_data.crd_number,
            "business_address": adv_data.business_address,
            "business_phone": adv_data.business_phone,
            "education": adv_data.education or [],
            "certifications": adv_data.certifications or [],
            "employment_history": adv_data.employment_history or [],
            "has_disciplinary_history": adv_data.has_disciplinary_history,
            "disciplinary_disclosure": adv_data.disciplinary_disclosure,
            "other_business_activities": adv_data.other_business_activities or [],
            "outside_business_conflicts": adv_data.outside_business_conflicts,
            "additional_compensation_sources": adv_data.additional_compensation_sources or [],
            "economic_benefit_disclosure": adv_data.economic_benefit_disclosure,
            "supervisor_name": adv_data.supervisor_name,
            "supervisor_phone": adv_data.supervisor_phone,
            "supervision_description": adv_data.supervision_description,
        }

    async def _generate_adv_2b_content(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Use Claude to generate ADV Part 2B content sections."""

        prompt = f"""Generate SEC-compliant ADV Part 2B (Brochure Supplement) content for the following investment adviser representative.

ADVISOR DATA:
{json.dumps(inputs, indent=2)}

Generate content for each required section following SEC Form ADV Part 2B requirements.
Use formal, clear language appropriate for regulatory filings.
Do NOT include any false or misleading statements.
If information is not provided, indicate "Not Applicable" or request the information be provided.

Return a JSON object with these sections:
{{
    "item_1_cover_page": {{
        "advisor_name": "...",
        "crd_number": "...",
        "firm_name": "...",
        "address": "...",
        "phone": "...",
        "date": "...",
        "disclaimer": "This brochure supplement provides information about [name] that supplements the [firm] brochure..."
    }},
    "item_2_education_and_experience": {{
        "narrative": "Educational background and business experience narrative...",
        "education_list": [...],
        "certifications_list": [...],
        "employment_list": [...]
    }},
    "item_3_disciplinary_information": {{
        "has_disclosure": true/false,
        "narrative": "..."
    }},
    "item_4_other_business_activities": {{
        "has_activities": true/false,
        "narrative": "...",
        "conflicts_disclosure": "..."
    }},
    "item_5_additional_compensation": {{
        "has_additional": true/false,
        "narrative": "..."
    }},
    "item_6_supervision": {{
        "supervisor_name": "...",
        "supervisor_phone": "...",
        "narrative": "..."
    }},
    "item_7_state_requirements": {{
        "applicable": true/false,
        "disclosures": [...]
    }}
}}

Return ONLY valid JSON, no other text."""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}],
            )

            content_text = response.content[0].text

            # Parse JSON from response
            if "```json" in content_text:
                content_text = content_text.split("```json")[1].split("```")[0]
            elif "```" in content_text:
                content_text = content_text.split("```")[1].split("```")[0]

            return json.loads(content_text.strip())

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response: {e}")
            return {
                "error": "Failed to parse AI response",
                "raw_response": content_text[:1000] if content_text else "",
            }
        except Exception as e:
            logger.error(f"AI generation failed: {e}")
            return {"error": f"AI generation failed: {str(e)}"}

    def _render_adv_2b_html(
        self, content: Dict[str, Any], adv_data: ADVPart2BData
    ) -> str:
        """Render ADV Part 2B content as HTML."""

        if "error" in content:
            return f"<div class='error'>Generation Error: {content['error']}</div>"

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Form ADV Part 2B - {adv_data.full_name}</title>
    <style>
        body {{ font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; max-width: 8.5in; margin: 0 auto; padding: 1in; }}
        h1 {{ font-size: 16pt; text-align: center; margin-bottom: 0.5in; }}
        h2 {{ font-size: 14pt; margin-top: 0.3in; border-bottom: 1px solid #000; padding-bottom: 5px; }}
        h3 {{ font-size: 12pt; margin-top: 0.2in; }}
        .cover-page {{ text-align: center; page-break-after: always; }}
        .cover-page h1 {{ font-size: 18pt; }}
        .disclaimer {{ font-size: 10pt; margin-top: 1in; }}
        .section {{ margin-bottom: 0.3in; }}
        table {{ width: 100%; border-collapse: collapse; margin: 0.2in 0; }}
        th, td {{ border: 1px solid #ccc; padding: 8px; text-align: left; }}
        th {{ background: #f5f5f5; }}
    </style>
</head>
<body>
"""

        # Item 1: Cover Page
        item1 = content.get("item_1_cover_page", {})
        html += f"""
    <div class="cover-page">
        <h1>Form ADV Part 2B<br>Brochure Supplement</h1>
        <p><strong>{item1.get('advisor_name', adv_data.full_name)}</strong></p>
        <p>CRD Number: {item1.get('crd_number', adv_data.crd_number or 'N/A')}</p>
        <p>{item1.get('address', adv_data.business_address or '')}</p>
        <p>Phone: {item1.get('phone', adv_data.business_phone or '')}</p>
        <p>Date: {item1.get('date', datetime.utcnow().strftime('%B %d, %Y'))}</p>
        <div class="disclaimer">
            <p>{item1.get('disclaimer', '')}</p>
        </div>
    </div>
"""

        # Item 2: Educational Background and Business Experience
        item2 = content.get("item_2_education_and_experience", {})
        html += f"""
    <div class="section">
        <h2>Item 2: Educational Background and Business Experience</h2>
        <p>{item2.get('narrative', '')}</p>
"""

        if item2.get("education_list"):
            html += "<h3>Education</h3><table><tr><th>Degree</th><th>Institution</th><th>Year</th></tr>"
            for edu in item2["education_list"]:
                html += f"<tr><td>{edu.get('degree', '')}</td><td>{edu.get('institution', '')}</td><td>{edu.get('year', '')}</td></tr>"
            html += "</table>"

        if item2.get("certifications_list"):
            html += "<h3>Professional Certifications</h3><table><tr><th>Certification</th><th>Issuer</th><th>Year</th></tr>"
            for cert in item2["certifications_list"]:
                html += f"<tr><td>{cert.get('name', '')}</td><td>{cert.get('issuer', '')}</td><td>{cert.get('year', '')}</td></tr>"
            html += "</table>"

        if item2.get("employment_list"):
            html += "<h3>Employment History</h3><table><tr><th>Firm</th><th>Title</th><th>Period</th></tr>"
            for emp in item2["employment_list"]:
                period = f"{emp.get('start', '')} - {emp.get('end', 'Present')}"
                html += f"<tr><td>{emp.get('firm', '')}</td><td>{emp.get('title', '')}</td><td>{period}</td></tr>"
            html += "</table>"

        html += "</div>"

        # Item 3: Disciplinary Information
        item3 = content.get("item_3_disciplinary_information", {})
        html += f"""
    <div class="section">
        <h2>Item 3: Disciplinary Information</h2>
        <p>{item3.get('narrative', "There are no legal or disciplinary events that are material to a client's evaluation of this advisory person.")}</p>
    </div>
"""

        # Item 4: Other Business Activities
        item4 = content.get("item_4_other_business_activities", {})
        conflicts = item4.get("conflicts_disclosure", "")
        html += f"""
    <div class="section">
        <h2>Item 4: Other Business Activities</h2>
        <p>{item4.get('narrative', 'The supervised person is not actively engaged in any other investment-related business or occupation.')}</p>
        {f"<p><strong>Conflicts:</strong> {conflicts}</p>" if conflicts else ''}
    </div>
"""

        # Item 5: Additional Compensation
        item5 = content.get("item_5_additional_compensation", {})
        html += f"""
    <div class="section">
        <h2>Item 5: Additional Compensation</h2>
        <p>{item5.get('narrative', 'The supervised person does not receive any economic benefit from any person other than the firm in connection with providing advisory services.')}</p>
    </div>
"""

        # Item 6: Supervision
        item6 = content.get("item_6_supervision", {})
        html += f"""
    <div class="section">
        <h2>Item 6: Supervision</h2>
        <p><strong>Supervisor:</strong> {item6.get('supervisor_name', adv_data.supervisor_name or 'N/A')}</p>
        <p><strong>Phone:</strong> {item6.get('supervisor_phone', adv_data.supervisor_phone or 'N/A')}</p>
        <p>{item6.get('narrative', '')}</p>
    </div>
"""

        # Item 7: Requirements for State-Registered Advisers
        item7 = content.get("item_7_state_requirements", {})
        if item7.get("applicable"):
            disclosures = item7.get("disclosures", [])
            html += f"""
    <div class="section">
        <h2>Item 7: Requirements for State-Registered Advisers</h2>
        <p>{"<br>".join(disclosures) if disclosures else 'No additional state disclosures required.'}</p>
    </div>
"""

        html += """
</body>
</html>
"""
        return html

    # ==================== FORM CRS ====================

    async def generate_form_crs(
        self,
        firm_id: UUID,
        created_by: UUID,
        regenerate: bool = False,
    ) -> ComplianceDocumentVersion:
        """Generate Form CRS (Client Relationship Summary) for a firm."""

        # Get firm CRS data
        result = await self.db.execute(
            select(FormCRSData).where(FormCRSData.firm_id == firm_id)
        )
        crs_data = result.scalar_one_or_none()

        if not crs_data:
            raise ValueError(f"No Form CRS data found for firm {firm_id}")

        # Get or create document
        result = await self.db.execute(
            select(ComplianceDocument).where(
                ComplianceDocument.firm_id == firm_id,
                ComplianceDocument.document_type == DocumentType.FORM_CRS,
            )
        )
        document = result.scalar_one_or_none()

        if not document:
            document = ComplianceDocument(
                firm_id=firm_id,
                document_type=DocumentType.FORM_CRS,
                title=f"Form CRS - {crs_data.firm_name}",
                description="Client Relationship Summary",
                status=DocumentStatus.DRAFT,
                created_by=created_by,
            )
            self.db.add(document)
            await self.db.flush()

        # Prepare generation inputs
        generation_inputs = self._prepare_crs_inputs(crs_data)

        # Generate content
        content_json = await self._generate_crs_content(generation_inputs)

        # Render HTML
        content_html = self._render_crs_html(content_json, crs_data)

        # Calculate version number
        result = await self.db.execute(
            select(ComplianceDocumentVersion)
            .where(ComplianceDocumentVersion.document_id == document.id)
            .order_by(desc(ComplianceDocumentVersion.version_number))
            .limit(1)
        )
        latest_version = result.scalar_one_or_none()

        version_number = (latest_version.version_number + 1) if latest_version else 1

        # Create new version
        prompt_hash = hashlib.sha256(
            json.dumps(generation_inputs, sort_keys=True).encode()
        ).hexdigest()[:16]

        version = ComplianceDocumentVersion(
            document_id=document.id,
            version_number=version_number,
            content_json=content_json,
            content_html=content_html,
            ai_generated=True,
            ai_model="claude-sonnet-4-20250514",
            ai_prompt_hash=prompt_hash,
            generation_inputs=generation_inputs,
            status=DocumentStatus.DRAFT,
            created_by=created_by,
        )
        self.db.add(version)
        await self.db.flush()

        document.current_version_id = version.id

        await self.db.commit()
        await self.db.refresh(version)

        logger.info(f"Generated Form CRS v{version_number} for firm {firm_id}")
        return version

    def _prepare_crs_inputs(self, crs_data: FormCRSData) -> Dict[str, Any]:
        """Prepare structured inputs for Form CRS generation."""
        return {
            "firm_name": crs_data.firm_name,
            "crd_number": crs_data.crd_number,
            "sec_number": crs_data.sec_number,
            "is_broker_dealer": crs_data.is_broker_dealer,
            "is_investment_adviser": crs_data.is_investment_adviser,
            "services_offered": crs_data.services_offered or [],
            "account_minimums": crs_data.account_minimums or {},
            "investment_authority": crs_data.investment_authority,
            "account_monitoring": crs_data.account_monitoring,
            "fee_structure": crs_data.fee_structure or [],
            "other_fees": crs_data.other_fees or [],
            "standard_of_conduct": crs_data.standard_of_conduct,
            "conflicts_of_interest": crs_data.conflicts_of_interest or [],
            "has_disciplinary_history": crs_data.has_disciplinary_history,
        }

    async def _generate_crs_content(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Use Claude to generate Form CRS content."""

        prompt = f"""Generate SEC-compliant Form CRS (Client Relationship Summary) content for the following investment adviser.

FIRM DATA:
{json.dumps(inputs, indent=2)}

Generate content following SEC Form CRS requirements. The document MUST be 2 pages or less.
Use clear, plain English. Avoid jargon. Write at an 8th-grade reading level.
Include required "Conversation Starter" questions in each section.

Return a JSON object with these sections:
{{
    "introduction": {{
        "heading": "...",
        "firm_type_statement": "...",
        "free_tools_reference": "Investor.gov/CRS"
    }},
    "relationships_and_services": {{
        "heading": "What investment services and advice can you provide me?",
        "services_description": "...",
        "monitoring_description": "...",
        "investment_authority": "...",
        "limitations": "...",
        "conversation_starters": ["Given my financial situation, should I choose an investment advisory service? Why or why not?", "..."]
    }},
    "fees_costs_conflicts": {{
        "heading": "What fees will I pay?",
        "fee_description": "...",
        "other_fees": "...",
        "fee_impact": "...",
        "conversation_starters": ["Help me understand how these fees and costs might affect my investments.", "..."]
    }},
    "standard_of_conduct": {{
        "heading": "When we act as your investment adviser, we have to act in your best interest...",
        "fiduciary_statement": "...",
        "conflicts_disclosure": "...",
        "conversation_starters": ["How might your conflicts of interest affect me, and how will you address them?"]
    }},
    "disciplinary_history": {{
        "heading": "Do you or your financial professionals have legal or disciplinary history?",
        "response": "...",
        "brokercheck_reference": "..."
    }},
    "additional_information": {{
        "heading": "Additional Information",
        "contact_info": "...",
        "conversation_starters": ["Who is my primary contact person?", "..."]
    }}
}}

Return ONLY valid JSON, no other text."""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}],
            )

            content_text = response.content[0].text

            if "```json" in content_text:
                content_text = content_text.split("```json")[1].split("```")[0]
            elif "```" in content_text:
                content_text = content_text.split("```")[1].split("```")[0]

            return json.loads(content_text.strip())

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response: {e}")
            return {
                "error": "Failed to parse AI response",
                "raw_response": content_text[:1000] if content_text else "",
            }
        except Exception as e:
            logger.error(f"AI generation failed: {e}")
            return {"error": f"AI generation failed: {str(e)}"}

    def _render_crs_html(self, content: Dict[str, Any], crs_data: FormCRSData) -> str:
        """Render Form CRS content as HTML (max 2 pages)."""

        if "error" in content:
            return f"<div class='error'>Generation Error: {content['error']}</div>"

        firm_type_parts = []
        if crs_data.is_investment_adviser:
            firm_type_parts.append("Investment Adviser")
        if crs_data.is_broker_dealer:
            firm_type_parts.append("Broker-Dealer")
        firm_type = " | ".join(firm_type_parts) if firm_type_parts else "Investment Adviser"

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Form CRS - {crs_data.firm_name}</title>
    <style>
        body {{ font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; max-width: 8.5in; margin: 0 auto; padding: 0.5in; }}
        h1 {{ font-size: 14pt; text-align: center; margin-bottom: 0.2in; }}
        h2 {{ font-size: 11pt; background: #e0e0e0; padding: 5px 10px; margin-top: 0.15in; margin-bottom: 0.1in; }}
        .intro {{ text-align: center; margin-bottom: 0.2in; }}
        .section {{ margin-bottom: 0.15in; }}
        .conversation-starter {{ background: #f5f5f5; padding: 8px; margin: 0.1in 0; font-style: italic; border-left: 3px solid #007bff; }}
        p {{ margin: 0.05in 0; }}
    </style>
</head>
<body>
    <h1>Form CRS - Client Relationship Summary</h1>
    <div class="intro">
        <p><strong>{crs_data.firm_name}</strong></p>
        <p>{firm_type}</p>
        <p>Date: {datetime.utcnow().strftime('%B %d, %Y')}</p>
    </div>
"""

        # Introduction
        intro = content.get("introduction", {})
        html += f"""
    <div class="section">
        <p>{intro.get('firm_type_statement', '')}</p>
        <p>Free and simple tools are available at <strong>Investor.gov/CRS</strong> to help you research firms and financial professionals.</p>
    </div>
"""

        # Relationships and Services
        rs = content.get("relationships_and_services", {})
        starters = rs.get("conversation_starters", [])
        html += f"""
    <div class="section">
        <h2>{rs.get('heading', 'What investment services and advice can you provide me?')}</h2>
        <p>{rs.get('services_description', '')}</p>
        <p>{rs.get('monitoring_description', '')}</p>
        <p>{rs.get('investment_authority', '')}</p>
        <p>{rs.get('limitations', '')}</p>
        <div class="conversation-starter">
            <strong>Ask your financial professional:</strong> {' '.join(starters)}
        </div>
    </div>
"""

        # Fees
        fees = content.get("fees_costs_conflicts", {})
        fee_starters = fees.get("conversation_starters", [])
        html += f"""
    <div class="section">
        <h2>{fees.get('heading', 'What fees will I pay?')}</h2>
        <p>{fees.get('fee_description', '')}</p>
        <p>{fees.get('other_fees', '')}</p>
        <p><em>{fees.get('fee_impact', '')}</em></p>
        <div class="conversation-starter">
            <strong>Ask your financial professional:</strong> {' '.join(fee_starters)}
        </div>
    </div>
"""

        # Standard of Conduct
        soc = content.get("standard_of_conduct", {})
        soc_starters = soc.get("conversation_starters", [])
        html += f"""
    <div class="section">
        <h2>{soc.get('heading', 'When we act as your investment adviser, we have to act in your best interest and not put our interest ahead of yours.')}</h2>
        <p>{soc.get('fiduciary_statement', '')}</p>
        <p>{soc.get('conflicts_disclosure', '')}</p>
        <div class="conversation-starter">
            <strong>Ask your financial professional:</strong> {' '.join(soc_starters)}
        </div>
    </div>
"""

        # Disciplinary History
        dh = content.get("disciplinary_history", {})
        html += f"""
    <div class="section">
        <h2>{dh.get('heading', 'Do you or your financial professionals have legal or disciplinary history?')}</h2>
        <p>{dh.get('response', '')}</p>
        <p>{dh.get('brokercheck_reference', 'Visit <strong>Investor.gov/CRS</strong> or <strong>BrokerCheck.finra.org</strong> for a free and simple search tool.')}</p>
    </div>
"""

        # Additional Information
        ai_section = content.get("additional_information", {})
        ai_starters = ai_section.get("conversation_starters", [])
        html += f"""
    <div class="section">
        <h2>{ai_section.get('heading', 'Additional Information')}</h2>
        <p>{ai_section.get('contact_info', '')}</p>
        <div class="conversation-starter">
            <strong>Ask your financial professional:</strong> {' '.join(ai_starters)}
        </div>
    </div>
</body>
</html>
"""
        return html

    # ==================== DOCUMENT MANAGEMENT ====================

    async def get_document(self, document_id: UUID) -> Optional[ComplianceDocument]:
        """Get a compliance document by ID."""
        result = await self.db.execute(
            select(ComplianceDocument).where(ComplianceDocument.id == document_id)
        )
        return result.scalar_one_or_none()

    async def get_firm_documents(
        self,
        firm_id: UUID,
        document_type: Optional[DocumentType] = None,
    ) -> List[ComplianceDocument]:
        """Get all compliance documents for a firm."""
        query = select(ComplianceDocument).where(ComplianceDocument.firm_id == firm_id)
        if document_type:
            query = query.where(ComplianceDocument.document_type == document_type)
        query = query.order_by(desc(ComplianceDocument.updated_at))

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_version(self, version_id: UUID) -> Optional[ComplianceDocumentVersion]:
        """Get a specific document version."""
        result = await self.db.execute(
            select(ComplianceDocumentVersion).where(
                ComplianceDocumentVersion.id == version_id
            )
        )
        return result.scalar_one_or_none()

    async def get_document_versions(
        self, document_id: UUID
    ) -> List[ComplianceDocumentVersion]:
        """Get all versions of a document."""
        result = await self.db.execute(
            select(ComplianceDocumentVersion)
            .where(ComplianceDocumentVersion.document_id == document_id)
            .order_by(desc(ComplianceDocumentVersion.version_number))
        )
        return list(result.scalars().all())

    async def approve_version(
        self,
        version_id: UUID,
        reviewer_id: UUID,
        review_notes: Optional[str] = None,
    ) -> ComplianceDocumentVersion:
        """Approve a document version."""
        version = await self.get_version(version_id)
        if not version:
            raise ValueError(f"Version {version_id} not found")

        version.status = DocumentStatus.APPROVED
        version.reviewed_by = reviewer_id
        version.reviewed_at = datetime.utcnow()
        version.review_notes = review_notes

        await self.db.commit()
        await self.db.refresh(version)

        logger.info(f"Approved document version {version_id}")
        return version

    async def publish_version(self, version_id: UUID) -> ComplianceDocumentVersion:
        """Publish an approved version."""
        version = await self.get_version(version_id)
        if not version:
            raise ValueError(f"Version {version_id} not found")

        if version.status != DocumentStatus.APPROVED:
            raise ValueError("Only approved versions can be published")

        version.status = DocumentStatus.PUBLISHED

        # Update parent document
        document = await self.get_document(version.document_id)
        if document:
            document.status = DocumentStatus.PUBLISHED
            document.effective_date = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(version)

        logger.info(f"Published document version {version_id}")
        return version

    async def archive_document(self, document_id: UUID) -> ComplianceDocument:
        """Archive a compliance document."""
        document = await self.get_document(document_id)
        if not document:
            raise ValueError(f"Document {document_id} not found")

        document.status = DocumentStatus.ARCHIVED

        await self.db.commit()
        await self.db.refresh(document)

        logger.info(f"Archived document {document_id}")
        return document

    # ==================== TEMPLATE MANAGEMENT ====================

    async def get_template(
        self,
        document_type: DocumentType,
        template_id: Optional[UUID] = None,
    ) -> Optional[DocumentTemplate]:
        """Get a document template, either by ID or the default for a type."""
        if template_id:
            result = await self.db.execute(
                select(DocumentTemplate).where(DocumentTemplate.id == template_id)
            )
        else:
            result = await self.db.execute(
                select(DocumentTemplate).where(
                    DocumentTemplate.document_type == document_type,
                    DocumentTemplate.is_default == True,
                    DocumentTemplate.is_active == True,
                )
            )
        return result.scalar_one_or_none()

    async def list_templates(
        self,
        document_type: Optional[DocumentType] = None,
        active_only: bool = True,
    ) -> List[DocumentTemplate]:
        """List available document templates."""
        query = select(DocumentTemplate)
        if document_type:
            query = query.where(DocumentTemplate.document_type == document_type)
        if active_only:
            query = query.where(DocumentTemplate.is_active == True)

        result = await self.db.execute(query)
        return list(result.scalars().all())
