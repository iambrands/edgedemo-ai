"""Parse brokerage position exports (CSV/XLSX) into standardized holdings."""

from __future__ import annotations

import io
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

import pandas as pd

_CASH_TYPES = {"cash and money market", "cash", "money market"}
_SKIP_SYMBOLS = {"--", "account total", "cash & cash investments"}


def _parse_money(value: Any) -> Decimal | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    if not text or text == "--":
        return None
    cleaned = text.replace("$", "").replace(",", "").replace(" ", "")
    if cleaned.startswith("(") and cleaned.endswith(")"):
        cleaned = f"-{cleaned[1:-1]}"
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def _parse_qty(value: Any) -> Decimal | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip().replace(",", "")
    if not text or text == "--":
        return None
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [
        re.sub(r"\s+", " ", str(c).strip().lower().replace("_", " "))
        for c in df.columns
    ]
    return df


def _find_header_row(raw_lines: list[str]) -> int | None:
    for idx, line in enumerate(raw_lines[:20]):
        lower = line.lower()
        if "symbol" in lower and ("mkt val" in lower or "market value" in lower):
            return idx
    return None


def _read_csv_dataframe(file_content: bytes) -> pd.DataFrame:
    text = file_content.decode("utf-8", errors="replace")
    lines = text.splitlines()
    header_idx = _find_header_row(lines)
    if header_idx is not None:
        trimmed = "\n".join(lines[header_idx:])
        df = pd.read_csv(io.StringIO(trimmed))
    else:
        try:
            df = pd.read_csv(io.BytesIO(file_content), encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(file_content), encoding="latin-1")
    return _normalize_columns(df.dropna(how="all"))


def _column(df: pd.DataFrame, *candidates: str) -> str | None:
    for col in df.columns:
        for candidate in candidates:
            if candidate in col:
                return col
    return None


def parse_portfolio_file(file_content: bytes, filename: str) -> dict[str, Any]:
    """
    Parse CSV or XLSX portfolio export.
    Returns {holdings, total_value, custodian, position_count}.
    """
    ext = filename.lower().rsplit(".", 1)[-1]
    if ext == "csv":
        df = _read_csv_dataframe(file_content)
    elif ext in {"xlsx", "xls"}:
        df = _normalize_columns(pd.read_excel(io.BytesIO(file_content), engine="openpyxl", sheet_name=0))
        df = df.dropna(how="all")
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    if df.empty:
        raise ValueError("File appears to be empty")

    symbol_col = _column(df, "symbol", "ticker")
    value_col = _column(df, "mkt val", "market value", "value", "total value")
    qty_col = _column(df, "qty", "quantity", "shares")
    price_col = _column(df, "price", "last price", "market price")
    desc_col = _column(df, "description", "security name", "name")
    type_col = _column(df, "security type", "asset class", "type")

    if not symbol_col:
        raise ValueError("Could not identify symbol column in file.")

    holdings: list[dict[str, Any]] = []
    total_value = Decimal("0")

    for _, row in df.iterrows():
        symbol = str(row.get(symbol_col, "")).strip()
        if not symbol or symbol.lower() in _SKIP_SYMBOLS:
            continue

        security_type = str(row.get(type_col, "Equity")).strip() if type_col else "Equity"
        description = str(row.get(desc_col, symbol)).strip() if desc_col else symbol

        market_value = _parse_money(row.get(value_col)) if value_col else None
        quantity = _parse_qty(row.get(qty_col)) if qty_col else None
        price = _parse_money(row.get(price_col)) if price_col else None

        if market_value is None and quantity is not None and price is not None:
            market_value = quantity * price

        if market_value is None or market_value <= 0:
            continue

        is_cash = security_type.lower() in _CASH_TYPES or symbol.upper() in {"CASH", "SGUXX"}
        asset_class = "Cash & Equivalents" if is_cash else _map_asset_class(security_type)

        holdings.append(
            {
                "symbol": symbol.upper() if not is_cash else symbol,
                "description": description,
                "quantity": float(quantity) if quantity is not None else None,
                "price": float(price) if price is not None else None,
                "market_value": float(market_value),
                "security_type": security_type,
                "asset_class": asset_class,
            }
        )
        total_value += market_value

    custodian = _detect_custodian(filename, df.columns.tolist())

    return {
        "holdings": holdings,
        "total_value": float(total_value),
        "custodian": custodian,
        "position_count": len(holdings),
    }


def _map_asset_class(security_type: str) -> str:
    lower = security_type.lower()
    if "etf" in lower or "closed end" in lower:
        return "US Equity"
    if "mutual fund" in lower:
        return "US Equity"
    if "fixed income" in lower or "bond" in lower or "treasury" in lower:
        return "Fixed Income"
    if "cash" in lower or "money market" in lower:
        return "Cash & Equivalents"
    if "equity" in lower:
        return "US Equity"
    return "US Equity"


def _detect_custodian(filename: str, columns: list[str]) -> str:
    name = filename.lower()
    if "schwab" in name or any("schwab" in c for c in columns):
        return "Charles Schwab"
    if "fidelity" in name:
        return "Fidelity"
    if "vanguard" in name:
        return "Vanguard"
    if "etrade" in name or "e*trade" in name:
        return "E*TRADE"
    if "robinhood" in name:
        return "Robinhood"
    return "Brokerage"


def scale_holdings(
    holdings: list[dict[str, Any]],
    *,
    target_invested: float,
    target_cash: float,
) -> tuple[list[dict[str, Any]], float]:
    """Scale non-cash holdings to target invested; normalize cash to target_cash."""
    cash_rows = [h for h in holdings if h.get("asset_class") == "Cash & Equivalents"]
    invest_rows = [h for h in holdings if h.get("asset_class") != "Cash & Equivalents"]

    invested_total = sum(h["market_value"] for h in invest_rows)
    if invested_total <= 0:
        return holdings, target_invested + target_cash

    invest_scale = target_invested / invested_total
    scaled: list[dict[str, Any]] = []

    for h in invest_rows:
        mv = round(h["market_value"] * invest_scale, 2)
        qty = h.get("quantity")
        price = h.get("price")
        if qty and price and price > 0:
            qty = round(mv / price, 4)
        scaled.append({**h, "market_value": mv, "quantity": qty})

    if cash_rows:
        cash_total = sum(h["market_value"] for h in cash_rows)
        cash_scale = target_cash / cash_total if cash_total > 0 else 1.0
        for h in cash_rows:
            mv = round(h["market_value"] * cash_scale, 2)
            scaled.append({**h, "market_value": mv})
    elif target_cash > 0:
        scaled.append(
            {
                "symbol": "CASH",
                "description": "Cash & Cash Investments",
                "quantity": None,
                "price": None,
                "market_value": target_cash,
                "security_type": "Cash and Money Market",
                "asset_class": "Cash & Equivalents",
            }
        )

    total = sum(h["market_value"] for h in scaled)
    return scaled, total


def load_demo_schwab_holdings(
    csv_path: Path | None = None,
    *,
    target_invested: float = 4_700_000,
    target_cash: float = 300_000,
) -> list[dict[str, Any]]:
    """Load and scale the bundled Schwab demo CSV for the premier demo persona."""
    path = csv_path or Path(__file__).resolve().parent.parent / "data" / "demo_schwab_positions.csv"
    if not path.exists():
        return []
    parsed = parse_portfolio_file(path.read_bytes(), path.name)
    scaled, _ = scale_holdings(
        parsed["holdings"],
        target_invested=target_invested,
        target_cash=target_cash,
    )
    return scaled
