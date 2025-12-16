import re
import html
from typing import Optional, Union

def validate_symbol(symbol: str) -> bool:
    """Validate stock symbol format"""
    if not symbol or len(symbol) > 10:
        return False
    return bool(re.match(r'^[A-Z]{1,5}(\.[A-Z]{1,2})?$', symbol.upper()))

def sanitize_input(text: Optional[str], max_length: int = 1000, allow_html: bool = False) -> str:
    """
    Sanitize user input to prevent XSS attacks
    
    Args:
        text: Input text to sanitize
        max_length: Maximum allowed length
        allow_html: If True, allows basic HTML (not recommended for user input)
    
    Returns:
        Sanitized string
    """
    if text is None:
        return ''
    
    # Convert to string
    text = str(text)
    
    # Truncate to max length
    if len(text) > max_length:
        text = text[:max_length]
    
    # Escape HTML to prevent XSS
    if not allow_html:
        text = html.escape(text)
    
    # Remove null bytes and control characters (except newlines and tabs)
    text = ''.join(char for char in text if ord(char) >= 32 or char in '\n\t')
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text

def sanitize_symbol(symbol: str) -> str:
    """Sanitize and validate stock symbol"""
    if not symbol:
        return ''
    # Remove any non-alphanumeric characters except dots
    symbol = re.sub(r'[^A-Za-z0-9.]', '', symbol.upper())
    # Validate format
    if not validate_symbol(symbol):
        return ''
    return symbol[:10]  # Max 10 characters

def sanitize_email(email: str) -> str:
    """Sanitize email address"""
    if not email:
        return ''
    # Basic email validation and sanitization
    email = email.strip().lower()
    # Remove any HTML/script tags
    email = html.escape(email)
    # Basic email format check
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return ''
    return email[:255]  # Max email length

def sanitize_float(value: Union[str, float, int, None], min_val: float = None, max_val: float = None) -> Optional[float]:
    """Sanitize and validate float value"""
    if value is None:
        return None
    
    try:
        float_val = float(value)
        
        if min_val is not None and float_val < min_val:
            return None
        if max_val is not None and float_val > max_val:
            return None
        
        return float_val
    except (ValueError, TypeError):
        return None

def sanitize_int(value: Union[str, int, None], min_val: int = None, max_val: int = None) -> Optional[int]:
    """Sanitize and validate integer value"""
    if value is None:
        return None
    
    try:
        int_val = int(float(value))  # Allow float strings like "5.0"
        
        if min_val is not None and int_val < min_val:
            return None
        if max_val is not None and int_val > max_val:
            return None
        
        return int_val
    except (ValueError, TypeError):
        return None

def format_currency(value: float) -> str:
    """Format value as currency"""
    if value is None:
        return '$0.00'
    return f'${value:,.2f}'

def format_percent(value: float, decimals: int = 2) -> str:
    """Format value as percentage"""
    if value is None:
        return '0.00%'
    return f'{value:.{decimals}f}%'

def calculate_dte(expiration_date: str) -> int:
    """Calculate days to expiration"""
    from datetime import date
    try:
        exp = date.fromisoformat(expiration_date)
        today = date.today()
        return (exp - today).days
    except:
        return 0

