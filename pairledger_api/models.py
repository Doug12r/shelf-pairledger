import uuid

from sqlalchemy import (
    Column,
    String,
    Text,
    SmallInteger,
    Boolean,
    Date,
    DateTime,
    Numeric,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    Index,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Household(Base):
    __tablename__ = "households"
    __table_args__ = (
        Index("idx_households_users", "user_a_id", "user_b_id"),
        {"schema": "pairledger"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    name = Column(String(200), nullable=False, server_default="Our Household")
    invite_code = Column(String(20), unique=True)
    user_a_id = Column(UUID(as_uuid=True), nullable=False)
    user_b_id = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    incomes = relationship("Income", back_populates="household", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="household", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="household", cascade="all, delete-orphan")
    settlements = relationship("Settlement", back_populates="household", cascade="all, delete-orphan")
    recurring_expenses = relationship("RecurringExpense", back_populates="household", cascade="all, delete-orphan")


class Income(Base):
    __tablename__ = "incomes"
    __table_args__ = (
        UniqueConstraint("household_id", "user_id", "effective_from", name="uq_income_user_date"),
        Index("idx_incomes_household", "household_id"),
        {"schema": "pairledger"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    household_id = Column(UUID(as_uuid=True), ForeignKey("pairledger.households.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    effective_from = Column(Date, nullable=False)
    notes = Column(String(500))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    household = relationship("Household", back_populates="incomes")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("household_id", "name", name="uq_category_name"),
        Index("idx_categories_household", "household_id"),
        {"schema": "pairledger"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    household_id = Column(UUID(as_uuid=True), ForeignKey("pairledger.households.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    icon = Column(String(10))
    color = Column(String(7))
    budget_monthly = Column(Numeric(12, 2))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    household = relationship("Household", back_populates="categories")


class Expense(Base):
    __tablename__ = "expenses"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_expense_amount"),
        CheckConstraint("split_type IN ('shared', 'personal', 'equal')", name="ck_expense_split_type"),
        Index("idx_expenses_household", "household_id"),
        Index("idx_expenses_date", "date"),
        Index("idx_expenses_category", "category_id"),
        Index("idx_expenses_paid_by", "paid_by"),
        Index("idx_expenses_tags", "tags", postgresql_using="gin"),
        {"schema": "pairledger"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    household_id = Column(UUID(as_uuid=True), ForeignKey("pairledger.households.id", ondelete="CASCADE"), nullable=False)
    paid_by = Column(UUID(as_uuid=True), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("pairledger.categories.id", ondelete="SET NULL"))
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String(500), nullable=False)
    date = Column(Date, nullable=False, server_default=text("CURRENT_DATE"))
    split_type = Column(String(10), nullable=False, server_default="shared")
    notes = Column(Text)
    tags = Column(ARRAY(Text), server_default=text("'{}'::text[]"))
    receipt_url = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    household = relationship("Household", back_populates="expenses")
    category = relationship("Category")


class Settlement(Base):
    __tablename__ = "settlements"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_settlement_amount"),
        Index("idx_settlements_household", "household_id"),
        {"schema": "pairledger"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    household_id = Column(UUID(as_uuid=True), ForeignKey("pairledger.households.id", ondelete="CASCADE"), nullable=False)
    from_user = Column(UUID(as_uuid=True), nullable=False)
    to_user = Column(UUID(as_uuid=True), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    date = Column(Date, nullable=False, server_default=text("CURRENT_DATE"))
    notes = Column(String(500))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    household = relationship("Household", back_populates="settlements")


class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_recurring_amount"),
        CheckConstraint("split_type IN ('shared', 'personal', 'equal')", name="ck_recurring_split_type"),
        CheckConstraint("frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')", name="ck_recurring_frequency"),
        Index("idx_recurring_household", "household_id"),
        {"schema": "pairledger"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    household_id = Column(UUID(as_uuid=True), ForeignKey("pairledger.households.id", ondelete="CASCADE"), nullable=False)
    paid_by = Column(UUID(as_uuid=True), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("pairledger.categories.id", ondelete="SET NULL"))
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String(500), nullable=False)
    split_type = Column(String(10), nullable=False, server_default="shared")
    frequency = Column(String(10), nullable=False, server_default="monthly")
    day_of_month = Column(SmallInteger)
    active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    household = relationship("Household", back_populates="recurring_expenses")
    category = relationship("Category")
