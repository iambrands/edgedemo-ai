import re

def validate_symbol(symbol: str) -> bool:
    """Validate stock symbol format"""
    if not symbol or len(symbol) > 10:
        return False
    return bool(re.match(r'^[A-Z]{1,5}(\.[A-Z]{1,2})?$', symbol.upper()))

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

