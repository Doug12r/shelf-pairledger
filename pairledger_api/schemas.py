from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


# ── Household ─────────────────────────────────────────────────────────

class HouseholdCreate(BaseModel):
    name: str = Field("Our Household", max_length=200)


class HouseholdJoin(BaseModel):
    invite_code: str = Field(..., min_length=1, max_length=20)


class HouseholdResponse(BaseModel):
    id: str
    name: str
    invite_code: Optional[str]
    user_a_id: str
    user_b_id: Optional[str]
    created_at: str


# ── Income ────────────────────────────────────────────────────────────

class IncomeCreate(BaseModel):
    amount: float = Field(..., gt=0)
    effective_from: date
    notes: Optional[str] = Field(None, max_length=500)


class IncomeResponse(BaseModel):
    id: str
    user_id: str
    amount: float
    effective_from: str
    notes: Optional[str]
    created_at: str


class SplitRatio(BaseModel):
    user_a_id: str
    user_a_income: float
    user_a_ratio: float
    user_b_id: Optional[str]
    user_b_income: float
    user_b_ratio: float


# ── Category ──────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    icon: Optional[str] = Field(None, max_length=10)
    color: Optional[str] = Field(None, max_length=7)
    budget_monthly: Optional[float] = Field(None, ge=0)


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    icon: Optional[str] = Field(None, max_length=10)
    color: Optional[str] = Field(None, max_length=7)
    budget_monthly: Optional[float] = Field(None, ge=0)


class CategoryResponse(BaseModel):
    id: str
    name: str
    icon: Optional[str]
    color: Optional[str]
    budget_monthly: Optional[float]
    created_at: str


# ── Expense ───────────────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    amount: float = Field(..., gt=0)
    description: str = Field(..., min_length=1, max_length=500)
    date: date = Field(default_factory=date.today)
    category_id: Optional[str] = None
    paid_by: Optional[str] = None  # defaults to current user
    split_type: str = Field("shared", pattern=r"^(shared|personal|equal)$")
    notes: Optional[str] = Field(None, max_length=50000)
    tags: list[str] = Field(default_factory=list)
    receipt_url: Optional[str] = Field(None, max_length=2000)


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    date: Optional[date] = None
    category_id: Optional[str] = None
    paid_by: Optional[str] = None
    split_type: Optional[str] = Field(None, pattern=r"^(shared|personal|equal)$")
    notes: Optional[str] = Field(None, max_length=50000)
    tags: Optional[list[str]] = None
    receipt_url: Optional[str] = Field(None, max_length=2000)


class ExpenseResponse(BaseModel):
    id: str
    paid_by: str
    category_id: Optional[str]
    category_name: Optional[str] = None
    category_icon: Optional[str] = None
    amount: float
    description: str
    date: str
    split_type: str
    notes: Optional[str]
    tags: list[str]
    receipt_url: Optional[str]
    created_at: str


class ExpenseListResponse(BaseModel):
    expenses: list[ExpenseResponse]
    total: int
    page: int
    per_page: int


# ── Settlement ────────────────────────────────────────────────────────

class SettlementCreate(BaseModel):
    from_user: str
    to_user: str
    amount: float = Field(..., gt=0)
    date: date = Field(default_factory=date.today)
    notes: Optional[str] = Field(None, max_length=500)


class SettlementResponse(BaseModel):
    id: str
    from_user: str
    to_user: str
    amount: float
    date: str
    notes: Optional[str]
    created_at: str


# ── Recurring ─────────────────────────────────────────────────────────

class RecurringCreate(BaseModel):
    amount: float = Field(..., gt=0)
    description: str = Field(..., min_length=1, max_length=500)
    paid_by: Optional[str] = None
    category_id: Optional[str] = None
    split_type: str = Field("shared", pattern=r"^(shared|personal|equal)$")
    frequency: str = Field("monthly", pattern=r"^(weekly|biweekly|monthly|yearly)$")
    day_of_month: Optional[int] = Field(None, ge=1, le=31)


class RecurringUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    paid_by: Optional[str] = None
    category_id: Optional[str] = None
    split_type: Optional[str] = Field(None, pattern=r"^(shared|personal|equal)$")
    frequency: Optional[str] = Field(None, pattern=r"^(weekly|biweekly|monthly|yearly)$")
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    active: Optional[bool] = None


class RecurringResponse(BaseModel):
    id: str
    paid_by: str
    category_id: Optional[str]
    category_name: Optional[str] = None
    amount: float
    description: str
    split_type: str
    frequency: str
    day_of_month: Optional[int]
    active: bool
    created_at: str


# ── Balance & Stats ───────────────────────────────────────────────────

class BalanceResponse(BaseModel):
    user_a_id: str
    user_b_id: Optional[str]
    user_a_paid: float
    user_b_paid: float
    user_a_fair_share: float
    user_b_fair_share: float
    net_balance: float  # positive = A owes B, negative = B owes A
    settlements_total: float


class MonthlySummary(BaseModel):
    year: int
    month: int
    total_spent: float
    shared_total: float
    personal_total: float
    equal_total: float
    user_a_paid: float
    user_b_paid: float
    by_category: list[dict]


class CategorySpending(BaseModel):
    category_id: Optional[str]
    category_name: str
    total: float
    count: int
    budget: Optional[float]


class MonthlyTrend(BaseModel):
    month: str  # "2026-01"
    total: float
    shared: float
    personal: float


# ── Search ────────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    id: str
    description: str
    amount: float
    date: str
    paid_by: str
    snippet: str
