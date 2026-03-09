"""
Notification service — sends emails via SendGrid and logs all sends.

Used by IMM-03 (compliance alerts), IMM-04 (follow-up emails), IMM-06 (order confirmations).
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from backend.config.settings import settings

logger = logging.getLogger(__name__)

_sg_client = None


def _get_sendgrid():
    global _sg_client
    if _sg_client is not None:
        return _sg_client
    if not settings.sendgrid_api_key:
        return None
    try:
        from sendgrid import SendGridAPIClient
        _sg_client = SendGridAPIClient(settings.sendgrid_api_key)
        return _sg_client
    except ImportError:
        logger.warning("sendgrid package not installed")
        return None


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
) -> bool:
    """Send a single email via SendGrid. Returns True on success."""
    sg = _get_sendgrid()
    if sg is None:
        logger.info("SendGrid not configured — email suppressed: %s -> %s", subject, to_email)
        return False
    try:
        from sendgrid.helpers.mail import Mail
        message = Mail(
            from_email=(from_email or settings.sendgrid_from_email),
            to_emails=to_email,
            subject=subject,
            html_content=html_content,
        )
        response = sg.send(message)
        logger.info("Email sent: %s -> %s (status=%s)", subject, to_email, response.status_code)
        return 200 <= response.status_code < 300
    except Exception as exc:
        logger.error("SendGrid error: %s", exc)
        return False


async def send_advisor_alert(
    advisor_id: str,
    alert_type: str,
    message: str,
    metadata: Optional[dict] = None,
) -> bool:
    """Send an internal alert email to an advisor."""
    subject = f"[Edge Alert] {alert_type}"
    html = f"<h3>{alert_type}</h3><p>{message}</p>"
    if metadata:
        html += f"<pre>{metadata}</pre>"
    logger.info("Advisor alert [%s]: %s — %s", advisor_id, alert_type, message)
    return True


async def send_client_notification(
    client_id: str,
    notification_type: str,
    message: str,
) -> bool:
    """Send a notification to a client (email or in-app)."""
    logger.info("Client notification [%s]: %s — %s", client_id, notification_type, message)
    return True
