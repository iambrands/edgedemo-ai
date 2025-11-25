from flask import request, current_app
from datetime import datetime
from models.error_log import ErrorLog
import traceback

def log_error(error_type: str, error_message: str, user_id: int = None,
             context: dict = None, symbol: str = None, trade_id: int = None,
             position_id: int = None, automation_id: int = None,
             error_code: str = None):
    """
    Log an error
    
    Args:
        error_type: Type of error (e.g., 'APIError', 'ValidationError')
        error_message: Error message
        user_id: User ID (optional)
        context: Additional context as dict
        symbol: Symbol if applicable
        trade_id: Trade ID if applicable
        position_id: Position ID if applicable
        automation_id: Automation ID if applicable
        error_code: Error code if applicable
    """
    try:
        db = current_app.extensions['sqlalchemy']
        
        # Get request context
        ip_address = request.remote_addr if request else None
        endpoint = request.endpoint if request else None
        
        # Get stack trace
        stack_trace = traceback.format_exc()
        
        error_log = ErrorLog(
            user_id=user_id,
            error_type=error_type,
            error_message=error_message,
            error_code=error_code,
            context=context,
            symbol=symbol,
            trade_id=trade_id,
            position_id=position_id,
            automation_id=automation_id,
            stack_trace=stack_trace,
            ip_address=ip_address,
            endpoint=endpoint
        )
        
        db.session.add(error_log)
        db.session.commit()
    except Exception as e:
        # Don't fail if error logging fails
        try:
            current_app.logger.error(f"Failed to log error: {str(e)}")
        except:
            pass

