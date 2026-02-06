"""Enums for EdgeAI RIA Platform models."""

import enum


class AccountType(str, enum.Enum):
    BROKERAGE = "BROKERAGE"
    TRADITIONAL_IRA = "TRADITIONAL_IRA"
    ROTH_IRA = "ROTH_IRA"
    SEP_IRA = "SEP_IRA"
    IRA_401K = "401K"
    VARIABLE_ANNUITY = "VARIABLE_ANNUITY"
    CASH_MANAGEMENT = "CASH_MANAGEMENT"
    JOINT = "JOINT"
    TRUST = "TRUST"
    CUSTODIAL = "CUSTODIAL"
    PLAN_529 = "529"


class AssetClass(str, enum.Enum):
    EQUITY = "EQUITY"
    FIXED_INCOME = "FIXED_INCOME"
    ALTERNATIVE = "ALTERNATIVE"
    CASH = "CASH"
    REAL_ESTATE = "REAL_ESTATE"
    COMMODITY = "COMMODITY"


class TransactionType(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"
    DIVIDEND = "DIVIDEND"
    INTEREST = "INTEREST"
    FEE = "FEE"
    TRANSFER_IN = "TRANSFER_IN"
    TRANSFER_OUT = "TRANSFER_OUT"
    CONTRIBUTION = "CONTRIBUTION"
    DISTRIBUTION = "DISTRIBUTION"
    REBALANCE = "REBALANCE"


class ParsingStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    NEEDS_REVIEW = "NEEDS_REVIEW"


class FeeType(str, enum.Enum):
    EXPENSE_RATIO = "EXPENSE_RATIO"
    ADVISORY = "ADVISORY"
    M_AND_E = "M_AND_E"
    SURRENDER_CHARGE = "SURRENDER_CHARGE"
    TRANSACTION = "TRANSACTION"
    WRAP = "WRAP"


class ComplianceResult(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    WARNING = "WARNING"


class ComplianceSeverity(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
