"""Initial PairLedger schema

Revision ID: 001
Revises:
Create Date: 2026-02-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS pairledger")

    op.create_table(
        "households",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False, server_default="Our Household"),
        sa.Column("invite_code", sa.String(20), unique=True),
        sa.Column("user_a_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_b_id", postgresql.UUID(as_uuid=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        schema="pairledger",
    )
    op.create_index("idx_households_users", "households", ["user_a_id", "user_b_id"], schema="pairledger")

    op.create_table(
        "incomes",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("notes", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["household_id"], ["pairledger.households.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("household_id", "user_id", "effective_from", name="uq_income_user_date"),
        schema="pairledger",
    )
    op.create_index("idx_incomes_household", "incomes", ["household_id"], schema="pairledger")

    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("icon", sa.String(10)),
        sa.Column("color", sa.String(7)),
        sa.Column("budget_monthly", sa.Numeric(12, 2)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["household_id"], ["pairledger.households.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("household_id", "name", name="uq_category_name"),
        schema="pairledger",
    )
    op.create_index("idx_categories_household", "categories", ["household_id"], schema="pairledger")

    op.create_table(
        "expenses",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("paid_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True)),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("date", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")),
        sa.Column("split_type", sa.String(10), nullable=False, server_default="shared"),
        sa.Column("notes", sa.Text()),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), server_default=sa.text("'{}'::text[]")),
        sa.Column("receipt_url", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["household_id"], ["pairledger.households.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["category_id"], ["pairledger.categories.id"], ondelete="SET NULL"),
        sa.CheckConstraint("amount > 0", name="ck_expense_amount"),
        sa.CheckConstraint("split_type IN ('shared', 'personal', 'equal')", name="ck_expense_split_type"),
        schema="pairledger",
    )
    op.create_index("idx_expenses_household", "expenses", ["household_id"], schema="pairledger")
    op.create_index("idx_expenses_date", "expenses", ["date"], schema="pairledger")
    op.create_index("idx_expenses_category", "expenses", ["category_id"], schema="pairledger")
    op.create_index("idx_expenses_paid_by", "expenses", ["paid_by"], schema="pairledger")
    op.create_index("idx_expenses_tags", "expenses", ["tags"], schema="pairledger", postgresql_using="gin")

    # Full-text search on expenses
    op.execute("""
        CREATE INDEX idx_expenses_fts ON pairledger.expenses USING GIN(
            to_tsvector('english', coalesce(description, '') || ' ' || coalesce(notes, ''))
        )
    """)

    op.create_table(
        "settlements",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_user", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("to_user", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("date", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")),
        sa.Column("notes", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["household_id"], ["pairledger.households.id"], ondelete="CASCADE"),
        sa.CheckConstraint("amount > 0", name="ck_settlement_amount"),
        schema="pairledger",
    )
    op.create_index("idx_settlements_household", "settlements", ["household_id"], schema="pairledger")

    op.create_table(
        "recurring_expenses",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("paid_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True)),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("split_type", sa.String(10), nullable=False, server_default="shared"),
        sa.Column("frequency", sa.String(10), nullable=False, server_default="monthly"),
        sa.Column("day_of_month", sa.SmallInteger()),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["household_id"], ["pairledger.households.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["category_id"], ["pairledger.categories.id"], ondelete="SET NULL"),
        sa.CheckConstraint("amount > 0", name="ck_recurring_amount"),
        sa.CheckConstraint("split_type IN ('shared', 'personal', 'equal')", name="ck_recurring_split_type"),
        sa.CheckConstraint("frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')", name="ck_recurring_frequency"),
        schema="pairledger",
    )
    op.create_index("idx_recurring_household", "recurring_expenses", ["household_id"], schema="pairledger")


def downgrade() -> None:
    op.drop_table("recurring_expenses", schema="pairledger")
    op.drop_table("settlements", schema="pairledger")
    op.drop_table("expenses", schema="pairledger")
    op.drop_table("categories", schema="pairledger")
    op.drop_table("incomes", schema="pairledger")
    op.drop_table("households", schema="pairledger")
    op.execute("DROP SCHEMA IF EXISTS pairledger CASCADE")
