from flask import request, current_app
from datetime import datetime
from models.audit_log import AuditLog

def log_audit(action_type: str, action_category: str, description: str,
              user_id: int = None, details: dict = None, symbol: str = None,
              trade_id: int = None, position_id: int = None, automation_id: int = None,
              success: bool = True, error_message: str = None):
    """
    Log an audit event
    
    Args:
        action_type: Type of action (e.g., 'trade_executed', 'automation_triggered')
        action_category: Category ('trade', 'automation', 'risk', 'system')
        description: Human-readable description
        user_id: User ID (optional)
        details: Additional details as dict
        symbol: Symbol if applicable
        trade_id: Trade ID if applicable
        position_id: Position ID if applicable
        automation_id: Automation ID if applicable
        success: Whether action succeeded
        error_message: Error message if failed
    """
    try:
        db = current_app.extensions['sqlalchemy']
        
        # Get request context
        ip_address = request.remote_addr if request else None
        user_agent = request.headers.get('User-Agent') if request else None
        endpoint = request.endpoint if request else None
        
        audit_log = AuditLog(
            user_id=user_id,
            action_type=action_type,
            action_category=action_category,
            description=description,
            details=details,
            symbol=symbol,
            trade_id=trade_id,
            position_id=position_id,
            automation_id=automation_id,
            ip_address=ip_address,
            user_agent=user_agent,
            endpoint=endpoint,
            success=success,
            error_message=error_message
        )
        
        db.session.add(audit_log)
        db.session.commit()
    except Exception as e:
        # Don't fail if audit logging fails
        try:
            current_app.logger.error(f"Failed to log audit: {str(e)}")
        except:
            pass

