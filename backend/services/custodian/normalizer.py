"""
Data normalizer for custodian-specific data to EdgeAI's unified format.

Maps custodian-specific terminology (e.g. Schwab "EQUITY", Fidelity "STOCK")
to the canonical CustodianAssetClass / CustodianTransactionType /
CustodianAccountType enums defined in models.custodian.
"""

from decimal import Decimal
from typing import Dict, Optional, Tuple

from backend.models.custodian import (
    CustodianAccountType,
    CustodianAssetClass,
    CustodianTransactionType,
)


class DataNormalizer:
    """Normalizes custodian-specific data to EdgeAI's unified format."""

    # ── Security type → asset class ────────────────────────────

    SECURITY_TYPE_MAP: Dict[str, CustodianAssetClass] = {
        "STOCK": CustodianAssetClass.EQUITY,
        "EQUITY": CustodianAssetClass.EQUITY,
        "COMMON_STOCK": CustodianAssetClass.EQUITY,
        "PREFERRED_STOCK": CustodianAssetClass.EQUITY,
        "BOND": CustodianAssetClass.FIXED_INCOME,
        "CORPORATE_BOND": CustodianAssetClass.FIXED_INCOME,
        "MUNICIPAL_BOND": CustodianAssetClass.FIXED_INCOME,
        "GOVERNMENT_BOND": CustodianAssetClass.FIXED_INCOME,
        "MUTUAL_FUND": CustodianAssetClass.MUTUAL_FUND,
        "ETF": CustodianAssetClass.ETF,
        "EXCHANGE_TRADED_FUND": CustodianAssetClass.ETF,
        "CASH": CustodianAssetClass.CASH,
        "MONEY_MARKET": CustodianAssetClass.CASH,
        "OPTION": CustodianAssetClass.OPTIONS,
        "FUTURE": CustodianAssetClass.FUTURES,
        "REAL_ESTATE": CustodianAssetClass.REAL_ESTATE,
        "REIT": CustodianAssetClass.REAL_ESTATE,
        "CRYPTO": CustodianAssetClass.CRYPTO,
        "COMMODITY": CustodianAssetClass.COMMODITIES,
    }

    # ── Transaction type mapping ───────────────────────────────

    TRANSACTION_TYPE_MAP: Dict[str, CustodianTransactionType] = {
        "BUY": CustodianTransactionType.BUY,
        "PURCHASE": CustodianTransactionType.BUY,
        "SELL": CustodianTransactionType.SELL,
        "SALE": CustodianTransactionType.SELL,
        "DIVIDEND": CustodianTransactionType.DIVIDEND,
        "INTEREST": CustodianTransactionType.INTEREST,
        "DEPOSIT": CustodianTransactionType.DEPOSIT,
        "WITHDRAWAL": CustodianTransactionType.WITHDRAWAL,
        "TRANSFER_IN": CustodianTransactionType.TRANSFER_IN,
        "TRANSFER_OUT": CustodianTransactionType.TRANSFER_OUT,
        "FEE": CustodianTransactionType.FEE,
        "TAX": CustodianTransactionType.TAX,
        "SPLIT": CustodianTransactionType.SPLIT,
        "MERGER": CustodianTransactionType.MERGER,
        "SPINOFF": CustodianTransactionType.SPINOFF,
        "EXERCISE": CustodianTransactionType.EXERCISE,
        "ASSIGNMENT": CustodianTransactionType.ASSIGNMENT,
        "EXPIRATION": CustodianTransactionType.EXPIRATION,
    }

    # ── Account type mapping ───────────────────────────────────

    ACCOUNT_TYPE_MAP: Dict[str, CustodianAccountType] = {
        "INDIVIDUAL": CustodianAccountType.INDIVIDUAL,
        "JOINT": CustodianAccountType.JOINT,
        "IRA": CustodianAccountType.IRA_TRADITIONAL,
        "TRADITIONAL_IRA": CustodianAccountType.IRA_TRADITIONAL,
        "IRA_TRADITIONAL": CustodianAccountType.IRA_TRADITIONAL,
        "ROTH_IRA": CustodianAccountType.IRA_ROTH,
        "ROTH": CustodianAccountType.IRA_ROTH,
        "IRA_ROTH": CustodianAccountType.IRA_ROTH,
        "SEP_IRA": CustodianAccountType.IRA_SEP,
        "IRA_SEP": CustodianAccountType.IRA_SEP,
        "SIMPLE_IRA": CustodianAccountType.IRA_SIMPLE,
        "IRA_SIMPLE": CustodianAccountType.IRA_SIMPLE,
        "TRUST": CustodianAccountType.TRUST,
        "CORPORATE": CustodianAccountType.CORPORATE,
        "PARTNERSHIP": CustodianAccountType.PARTNERSHIP,
        "PENSION": CustodianAccountType.PENSION,
        "HSA": CustodianAccountType.HSA,
        "529": CustodianAccountType.EDUCATION_529,
        "EDUCATION_529": CustodianAccountType.EDUCATION_529,
        "ESA": CustodianAccountType.EDUCATION_ESA,
        "EDUCATION_ESA": CustodianAccountType.EDUCATION_ESA,
        "ROLLOVER": CustodianAccountType.ROLLOVER,
        "CUSTODIAL": CustodianAccountType.CUSTODIAL,
    }

    # ── Public methods ─────────────────────────────────────────

    def normalize_asset_class(self, security_type: str) -> CustodianAssetClass:
        """Map a custodian's security type string to a CustodianAssetClass."""
        normalized = security_type.upper().replace(" ", "_").replace("-", "_")
        return self.SECURITY_TYPE_MAP.get(normalized, CustodianAssetClass.OTHER)

    def normalize_transaction_type(
        self, transaction_type: str
    ) -> CustodianTransactionType:
        """Map a custodian's transaction type string to CustodianTransactionType."""
        normalized = transaction_type.upper().replace(" ", "_").replace("-", "_")
        return self.TRANSACTION_TYPE_MAP.get(
            normalized, CustodianTransactionType.OTHER
        )

    def normalize_account_type(
        self, account_type: str
    ) -> CustodianAccountType:
        """Map a custodian's account type string to CustodianAccountType."""
        normalized = account_type.upper().replace(" ", "_").replace("-", "_")
        return self.ACCOUNT_TYPE_MAP.get(
            normalized, CustodianAccountType.OTHER
        )

    @staticmethod
    def infer_tax_status(account_type: CustodianAccountType) -> str:
        """Infer tax treatment from account type."""
        tax_deferred = {
            CustodianAccountType.IRA_TRADITIONAL,
            CustodianAccountType.IRA_SEP,
            CustodianAccountType.IRA_SIMPLE,
            CustodianAccountType.ROLLOVER,
            CustodianAccountType.PENSION,
            CustodianAccountType.PROFIT_SHARING,
        }
        tax_exempt = {
            CustodianAccountType.IRA_ROTH,
            CustodianAccountType.HSA,
        }
        if account_type in tax_deferred:
            return "tax_deferred"
        elif account_type in tax_exempt:
            return "tax_exempt"
        return "taxable"

    @staticmethod
    def calculate_unrealized_gain_loss(
        market_value: Decimal, cost_basis: Optional[Decimal]
    ) -> Tuple[Optional[Decimal], Optional[Decimal]]:
        """Calculate unrealized gain/loss and percentage."""
        if cost_basis is None or cost_basis == 0:
            return None, None
        gain_loss = market_value - cost_basis
        gain_loss_pct = (gain_loss / cost_basis) * 100
        return gain_loss, gain_loss_pct


# Module-level singleton
normalizer = DataNormalizer()
