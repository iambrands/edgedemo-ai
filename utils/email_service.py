"""Email service for sending notifications"""
from flask import current_app
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails"""
    
    def __init__(self):
        self.smtp_server = current_app.config.get('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = current_app.config.get('SMTP_PORT', 587)
        self.smtp_username = current_app.config.get('SMTP_USERNAME')
        self.smtp_password = current_app.config.get('SMTP_PASSWORD')
        self.from_email = current_app.config.get('FROM_EMAIL', 'noreply@iabadvisors.com')
        self.default_recipient = current_app.config.get('DEFAULT_FEEDBACK_EMAIL', 'leslie@iabadvisors.com')
    
    def send_email(self, to_email: str, subject: str, body: str, html_body: Optional[str] = None) -> bool:
        """
        Send an email
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Plain text body
            html_body: Optional HTML body
            
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            # If no SMTP credentials, just log (for development)
            if not self.smtp_username or not self.smtp_password:
                logger.info(f"Email would be sent to {to_email}: {subject}")
                logger.info(f"Body: {body}")
                return True
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add plain text and HTML
            msg.attach(MIMEText(body, 'plain'))
            if html_body:
                msg.attach(MIMEText(html_body, 'html'))
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {e}")
            return False
    
    def send_feedback_email(self, feedback_data: dict) -> bool:
        """
        Send feedback notification email to default recipient
        
        Args:
            feedback_data: Dictionary with feedback information
            
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            # Get user info
            from models.user import User
            db = current_app.extensions['sqlalchemy']
            user = db.session.query(User).get(feedback_data.get('user_id'))
            username = user.username if user else 'Unknown User'
            user_email = user.email if user and user.email else 'No email on file'
            
            # Build email subject
            feedback_type = feedback_data.get('feedback_type', 'general').upper()
            subject = f"[IAB OptionsBot] {feedback_type} Feedback: {feedback_data.get('title', 'No Title')}"
            
            # Build email body
            body = f"""
New Feedback Submitted

Type: {feedback_type}
Title: {feedback_data.get('title', 'N/A')}
User: {username} (ID: {feedback_data.get('user_id')})
User Email: {user_email}
Page: {feedback_data.get('page_url', 'N/A')}
Browser: {feedback_data.get('browser_info', 'N/A')}
Priority: {feedback_data.get('priority', 'medium')}
Created: {feedback_data.get('created_at', 'N/A')}

Message:
{feedback_data.get('message', 'No message')}

---
This is an automated notification from IAB OptionsBot Feedback System.
            """.strip()
            
            # Build HTML body
            html_body = f"""
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #4F46E5;">New Feedback Submitted</h2>
                <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
                  <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Type:</td><td style="padding: 8px; border: 1px solid #ddd;">{feedback_type}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Title:</td><td style="padding: 8px; border: 1px solid #ddd;">{feedback_data.get('title', 'N/A')}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">User:</td><td style="padding: 8px; border: 1px solid #ddd;">{username} (ID: {feedback_data.get('user_id')})</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">User Email:</td><td style="padding: 8px; border: 1px solid #ddd;">{user_email}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Page:</td><td style="padding: 8px; border: 1px solid #ddd;">{feedback_data.get('page_url', 'N/A')}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Browser:</td><td style="padding: 8px; border: 1px solid #ddd;">{feedback_data.get('browser_info', 'N/A')}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Priority:</td><td style="padding: 8px; border: 1px solid #ddd;">{feedback_data.get('priority', 'medium')}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Created:</td><td style="padding: 8px; border: 1px solid #ddd;">{feedback_data.get('created_at', 'N/A')}</td></tr>
                </table>
                <h3 style="color: #4F46E5;">Message:</h3>
                <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4F46E5; margin-bottom: 20px;">
                  <p style="white-space: pre-wrap;">{feedback_data.get('message', 'No message')}</p>
                </div>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">This is an automated notification from IAB OptionsBot Feedback System.</p>
              </body>
            </html>
            """
            
            # Send to default recipient
            return self.send_email(self.default_recipient, subject, body, html_body)
            
        except Exception as e:
            logger.error(f"Error sending feedback email: {e}")
            return False

def get_email_service():
    """Get email service instance"""
    try:
        return EmailService()
    except RuntimeError:
        # Outside Flask context, return None
        return None

