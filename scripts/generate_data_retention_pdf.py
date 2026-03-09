"""Generate Data Retention & Disposal Policy PDF for Edge platform."""
from fpdf import FPDF
import os

OUTPUT_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "frontend",
    "public",
    "documents",
    "data-retention-policy.pdf",
)

RETENTION_SCHEDULE = [
    {
        "category": "Client Account Records",
        "description": "KYC docs, account forms, IPS, risk profiles, signed agreements",
        "regulation": "SEC 204-2(a)(10), FINRA 4512",
        "retention": "6 yrs after account closure",
        "disposal": "Secure deletion w/ cert of destruction",
    },
    {
        "category": "Trade & Transaction Records",
        "description": "Order tickets, confirmations, execution reports, allocations",
        "regulation": "SEC 17a-4(b), FINRA 3110",
        "retention": "6 yrs from creation",
        "disposal": "Secure deletion; audit trail preserved",
    },
    {
        "category": "Communications & Correspondence",
        "description": "Emails, chat logs, meeting notes, client comms",
        "regulation": "SEC 17a-4(b)(4), FINRA 3110(b)",
        "retention": "3 yrs (general), 6 yrs (trade)",
        "disposal": "Secure deletion after hold expires",
    },
    {
        "category": "Compliance & Regulatory Filings",
        "description": "ADV filings, Form CRS, exception reports, audit logs",
        "regulation": "SEC 204-2(a)(17), IAA Sec. 206",
        "retention": "5 yrs from filing date",
        "disposal": "Secure deletion w/ CCO sign-off",
    },
    {
        "category": "Financial Statements & Reports",
        "description": "Portfolio statements, performance reports, billing, fees",
        "regulation": "SEC 204-2(a)(6)",
        "retention": "5 yrs from generation",
        "disposal": "Secure deletion; summaries preserved",
    },
    {
        "category": "Tax Documents",
        "description": "1099s, 1040 uploads, TLH records, cost basis reports",
        "regulation": "IRS Rev. Proc. 98-25, SEC 204-2",
        "retention": "7 yrs from tax year end",
        "disposal": "Secure deletion w/ audit trail entry",
    },
    {
        "category": "AI-Generated Content",
        "description": "Model outputs, recommendations, risk assessments, narratives",
        "regulation": "SEC AI Guidance (2024), FINRA 2210",
        "retention": "3 yrs from generation",
        "disposal": "Automated purge; metadata logs retained",
    },
    {
        "category": "System & Access Logs",
        "description": "Auth events, API access logs, data modification records",
        "regulation": "SOC 2 Type II, NIST 800-53",
        "retention": "2 yrs from event date",
        "disposal": "Automated rotation w/ archival",
    },
    {
        "category": "Marketing & Advertising",
        "description": "Marketing materials, ads, social media, website content",
        "regulation": "FINRA 2210, SEC 204-2(a)(11)",
        "retention": "3 yrs from last use",
        "disposal": "Secure deletion",
    },
]


class PolicyPDF(FPDF):
    BLUE = (37, 99, 235)
    DARK = (15, 23, 42)
    GRAY = (100, 116, 139)
    LIGHT_BG = (248, 250, 252)
    WHITE = (255, 255, 255)
    TABLE_HEADER_BG = (241, 245, 249)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*self.GRAY)
        self.cell(0, 8, "IAB Advisors, Inc. - Data Retention & Disposal Policy v1.0", align="L")
        self.cell(0, 8, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(*self.GRAY)
        self.cell(
            0,
            10,
            "CONFIDENTIAL - IAB Advisors, Inc. | compliance@edge.com | Wilmington, DE 19801",
            align="C",
        )

    def section_title(self, num, title):
        self.ln(6)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(*self.BLUE)
        self.cell(0, 8, f"{num}. {title}", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*self.DARK)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bullet(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*self.DARK)
        x = self.get_x()
        self.cell(6, 5.5, "-")
        self.multi_cell(0, 5.5, text)
        self.set_x(x)

    def sub_heading(self, text):
        self.set_font("Helvetica", "B", 10.5)
        self.set_text_color(*self.DARK)
        self.cell(0, 7, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)


def build_pdf():
    pdf = PolicyPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # ---- Cover / Title Block ----
    pdf.ln(20)
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(*PolicyPDF.BLUE)
    pdf.cell(0, 14, "Data Retention &", new_x="LMARGIN", new_y="NEXT", align="C")  # noqa: E501
    pdf.cell(0, 14, "Disposal Policy", new_x="LMARGIN", new_y="NEXT", align="C")  # noqa: E501
    pdf.ln(8)

    pdf.set_draw_color(*PolicyPDF.BLUE)
    pdf.set_line_width(0.8)
    mid = pdf.w / 2
    pdf.line(mid - 30, pdf.get_y(), mid + 30, pdf.get_y())
    pdf.ln(10)

    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(*PolicyPDF.DARK)
    pdf.cell(0, 7, "IAB Advisors, Inc. d/b/a Edge", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*PolicyPDF.GRAY)
    pdf.cell(0, 6, "Version 1.0  |  Effective March 1, 2026", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(6)
    pdf.cell(0, 6, "Wilmington, DE 19801", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.cell(0, 6, "compliance@edge.com", new_x="LMARGIN", new_y="NEXT", align="C")

    pdf.ln(30)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(*PolicyPDF.GRAY)
    pdf.multi_cell(
        0,
        5,
        "This document is the property of IAB Advisors, Inc. and is intended for authorized "
        "personnel, regulatory examiners, and clients upon request. Unauthorized distribution "
        "is prohibited.",
        align="C",
    )

    # ---- Section 1: Purpose ----
    pdf.add_page()
    pdf.section_title(1, "Purpose")
    pdf.body_text(
        'This Data Retention and Disposal Policy ("Policy") establishes the requirements for '
        "retaining, archiving, and securely disposing of data processed by the Edge platform. "
        "It ensures compliance with federal securities regulations, FINRA rules, state privacy "
        "laws, and industry best practices while protecting client confidentiality and minimizing "
        "data exposure risk."
    )

    # ---- Section 2: Scope ----
    pdf.section_title(2, "Scope")
    pdf.body_text(
        "This Policy applies to all data created, received, maintained, or transmitted by the "
        "Edge platform, including but not limited to:"
    )
    for item in [
        "Client personal and financial information (PII / NPI)",
        "Portfolio holdings, transactions, and trade records",
        "Communications between advisors and clients",
        "Compliance documentation and regulatory filings",
        "AI-generated analytics, recommendations, and reports",
        "System logs, audit trails, and access records",
        "Uploaded documents (tax returns, statements, agreements)",
    ]:
        pdf.bullet(item)
    pdf.ln(2)
    pdf.body_text(
        "This Policy applies to all employees, contractors, and third-party service providers "
        "with access to Edge platform data, regardless of storage medium (electronic, cloud, "
        "or physical)."
    )

    # ---- Section 3: Regulatory Framework ----
    pdf.section_title(3, "Regulatory Framework")
    pdf.body_text(
        "Retention periods in this Policy are governed by the following regulatory requirements. "
        "Where multiple regulations apply, the longest retention period controls."
    )
    regulations = [
        ("SEC Rule 17a-4", "Books and records preservation - 6 years for trade records, 3 years for general correspondence."),
        ("SEC Rule 204-2", "Investment adviser recordkeeping - 5 years for advisory contracts, financial statements, and communications relating to recommendations."),
        ("FINRA Rules 3110 / 4511", "Supervision and general books and records - correspondence review, order handling, and suitability documentation."),
        ("Investment Advisers Act Sec. 206", "Fiduciary records including conflict disclosures, suitability analyses, and best interest documentation."),
        ("IRS Rev. Proc. 98-25", "Electronic storage requirements for tax-related records - 7 years from the relevant tax year."),
        ("CCPA / State Privacy Laws", "Consumer data deletion rights, subject to regulatory retention exceptions under Cal. Civ. Code Sec. 1798.105(d)."),
    ]
    for name, desc in regulations:
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*PolicyPDF.DARK)
        pdf.cell(0, 5.5, f"  {name}", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9.5)
        pdf.set_text_color(*PolicyPDF.GRAY)
        pdf.multi_cell(0, 5, f"  {desc}")
        pdf.ln(1)

    # ---- Section 4: Retention Schedule ----
    pdf.add_page()
    pdf.section_title(4, "Retention Schedule")
    pdf.body_text(
        "The following table specifies minimum retention periods by data category. Data may be "
        "retained longer if subject to a legal hold, pending investigation, or client instruction."
    )

    col_w = [52, 42, 38, 48]
    headers = ["Data Category", "Regulation", "Retention", "Disposal Method"]

    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_fill_color(*PolicyPDF.TABLE_HEADER_BG)
    pdf.set_text_color(*PolicyPDF.DARK)
    for i, h in enumerate(headers):
        pdf.cell(col_w[i], 7, h, border=1, fill=True)
    pdf.ln()

    pdf.set_font("Helvetica", "", 8)
    for j, row in enumerate(RETENTION_SCHEDULE):
        fill = j % 2 == 1
        if fill:
            pdf.set_fill_color(*PolicyPDF.LIGHT_BG)
        h = 12
        x_start = pdf.get_x()
        y_start = pdf.get_y()

        if y_start + h > pdf.h - 25:
            pdf.add_page()
            pdf.set_font("Helvetica", "B", 8.5)
            pdf.set_fill_color(*PolicyPDF.TABLE_HEADER_BG)
            for i, hd in enumerate(headers):
                pdf.cell(col_w[i], 7, hd, border=1, fill=True)
            pdf.ln()
            pdf.set_font("Helvetica", "", 8)
            x_start = pdf.get_x()
            y_start = pdf.get_y()

        pdf.set_text_color(*PolicyPDF.DARK)
        pdf.cell(col_w[0], h, row["category"], border=1, fill=fill)
        pdf.set_text_color(*PolicyPDF.GRAY)
        pdf.cell(col_w[1], h, row["regulation"], border=1, fill=fill)
        pdf.set_text_color(*PolicyPDF.DARK)
        pdf.cell(col_w[2], h, row["retention"], border=1, fill=fill)
        pdf.set_text_color(*PolicyPDF.GRAY)
        pdf.cell(col_w[3], h, row["disposal"], border=1, fill=fill)
        pdf.ln()

    # ---- Section 5: Disposal Procedures ----
    pdf.ln(4)
    pdf.section_title(5, "Disposal Procedures")
    pdf.body_text(
        "When data reaches the end of its retention period and is not subject to a legal hold, "
        "it must be disposed of using methods appropriate to its classification level."
    )

    pdf.sub_heading("5.1 Electronic Data")
    for item in [
        "Database records: Cryptographic erasure (key destruction) or NIST SP 800-88 compliant secure deletion",
        "File storage: Multi-pass overwrite followed by verification",
        "Cloud storage (AWS S3 / Railway): Object deletion with versioning purge",
        "Redis cache: Automatic TTL-based expiration; manual FLUSHDB for decommissioning",
        "Encrypted backups: Key destruction renders backup data unrecoverable",
    ]:
        pdf.bullet(item)

    pdf.ln(2)
    pdf.sub_heading("5.2 Physical Media")
    for item in [
        "Paper documents: Cross-cut shredding (DIN 66399 Level P-4 or higher)",
        "Storage drives: Degaussing followed by physical destruction",
        "Portable media (USB, external drives): NIST SP 800-88 purge + physical destruction",
    ]:
        pdf.bullet(item)

    pdf.ln(2)
    pdf.sub_heading("5.3 Certificate of Destruction")
    pdf.body_text(
        "For all disposals of client financial data, a Certificate of Destruction is generated "
        "and retained for 3 years. Each certificate includes: data category, volume destroyed, "
        "method of destruction, date, and authorizing officer. Certificates are stored in the "
        "Edge compliance audit log and are available for regulatory examination."
    )

    # ---- Section 6: Legal Holds ----
    pdf.section_title(6, "Legal Holds & Exceptions")
    pdf.body_text(
        "Standard retention periods may be suspended when a legal hold is in effect. "
        "Legal holds apply when:"
    )
    for item in [
        "Litigation is pending, threatened, or reasonably anticipated",
        "A regulatory examination or investigation is active (SEC, FINRA, state regulators)",
        "An internal investigation requires evidence preservation",
        "A client disputes or requests data related to an open matter",
    ]:
        pdf.bullet(item)
    pdf.ln(2)
    pdf.body_text(
        "The Chief Compliance Officer issues and lifts legal holds. All personnel are notified "
        "in writing and must suspend destruction of affected data immediately upon notice."
    )

    # ---- Section 7: Client Deletion Requests ----
    pdf.section_title(7, "Client Data Deletion Requests")
    pdf.body_text(
        "Clients may request deletion of their personal data under CCPA, GDPR, or general "
        "privacy rights. Upon receiving a verified deletion request:"
    )
    steps = [
        "We identify all data associated with the requesting party across all systems.",
        "Data subject to regulatory retention is flagged and retained for the minimum required period only.",
        "All non-regulated data is deleted within 30 calendar days using approved disposal methods.",
        "The client receives written confirmation of deletion and a list of any data retained under regulatory exception, with estimated disposal dates.",
    ]
    for i, step in enumerate(steps):
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*PolicyPDF.BLUE)
        pdf.cell(8, 5.5, f"{chr(65 + i)}.")
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*PolicyPDF.DARK)
        pdf.multi_cell(0, 5.5, step)
        pdf.ln(1)

    pdf.ln(1)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*PolicyPDF.GRAY)
    pdf.multi_cell(
        0,
        5,
        "Regulatory exceptions to deletion requests include records required by SEC Rule 17a-4, "
        "FINRA Rule 4511, and IRS recordkeeping requirements. These exceptions are disclosed to "
        "the client per Cal. Civ. Code Sec. 1798.105(d).",
    )

    # ---- Section 8: Third-Party ----
    pdf.section_title(8, "Third-Party & Vendor Data")
    pdf.body_text(
        "Data shared with or received from third-party vendors (custodians, market data "
        "providers, AI model providers) is subject to the same retention and disposal "
        "requirements as internally-generated data. Vendor contracts include:"
    )
    for item in [
        "Certification of data deletion upon contract termination",
        "No retained copies beyond the contracted retention period",
        "Written acknowledgment that client data was not used for model training or secondary purposes",
        "Compliance with NIST SP 800-88 or equivalent for disposal",
    ]:
        pdf.bullet(item)

    # ---- Section 9: Backup & Archival ----
    pdf.section_title(9, "Backup & Archival")
    pdf.body_text(
        "Data is backed up daily to encrypted, geographically-separated storage. "
        "Backups follow a tiered lifecycle:"
    )
    tiers = [
        ("Hot (0-30 days)", "Full backups in primary region, immediate restore capability"),
        ("Warm (30-365 days)", "Compressed backups in secondary region, 4-hour restore SLA"),
        ("Cold (1-7 years)", "Archived to long-term storage, 24-hour restore SLA, retained per regulatory schedule"),
        ("Expiration", "Backups older than the maximum applicable retention period are destroyed via key destruction"),
    ]
    for name, desc in tiers:
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*PolicyPDF.DARK)
        pdf.cell(0, 5.5, f"  {name}", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9.5)
        pdf.set_text_color(*PolicyPDF.GRAY)
        pdf.multi_cell(0, 5, f"  {desc}")
        pdf.ln(1)

    # ---- Section 10: Governance ----
    pdf.section_title(10, "Governance & Review")
    for item in [
        "Policy Owner: Chief Compliance Officer, IAB Advisors, Inc.",
        "Review Cadence: Annually, or upon material regulatory change",
        "Audit: Retention and disposal practices are audited as part of the annual SOC 2 Type II examination",
        "Training: All employees and contractors receive data handling and retention training within 30 days of hire and annually thereafter",
        "Violations: Non-compliance may result in disciplinary action, up to and including termination, and may expose the firm to regulatory sanctions",
    ]:
        pdf.bullet(item)

    # ---- Section 11: Contact ----
    pdf.section_title(11, "Contact")
    pdf.body_text(
        "Questions about this Policy or data retention practices should be directed to:"
    )
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*PolicyPDF.DARK)
    pdf.cell(0, 6, "IAB Advisors, Inc. - Compliance Office", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 5.5, "Email: compliance@edge.com", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5.5, "Privacy inquiries: privacy@edge.com", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5.5, "Mail: IAB Advisors, Inc., Compliance Office, Wilmington, DE 19801", new_x="LMARGIN", new_y="NEXT")

    # ---- Version History ----
    pdf.ln(10)
    pdf.set_draw_color(*PolicyPDF.GRAY)
    pdf.set_line_width(0.3)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*PolicyPDF.DARK)
    pdf.cell(0, 7, "Version History", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*PolicyPDF.GRAY)
    pdf.cell(20, 5.5, "Version", border="B")
    pdf.cell(35, 5.5, "Date", border="B")
    pdf.cell(0, 5.5, "Description", border="B", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(*PolicyPDF.DARK)
    pdf.cell(20, 5.5, "1.0")
    pdf.cell(35, 5.5, "March 1, 2026")
    pdf.cell(0, 5.5, "Initial policy adopted", new_x="LMARGIN", new_y="NEXT")

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    pdf.output(OUTPUT_PATH)
    print(f"PDF generated: {OUTPUT_PATH}")
    print(f"Pages: {pdf.pages_count}")


if __name__ == "__main__":
    build_pdf()
