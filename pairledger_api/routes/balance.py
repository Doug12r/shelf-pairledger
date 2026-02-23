from uuid import UUID
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, extract, case, text
from shelf_auth_middleware import get_current_user, ShelfUser

from ..database import get_db
from ..models import Expense, Settlement, Income, Category
from ..schemas import (
    BalanceResponse,
    MonthlySummary,
    CategorySpending,
    MonthlyTrend,
)
from .household import get_user_household

router = APIRouter(prefix="/api", tags=["balance"])


async def _get_split_ratio(household_id: UUID, user_a_id: UUID, user_b_id: UUID | None, db: AsyncSession) -> tuple[float, float]:
    """Get current income split ratio."""
    a_income = (
        await db.execute(
            select(Income.amount)
            .where(Income.household_id == household_id, Income.user_id == user_a_id)
            .order_by(desc(Income.effective_from))
            .limit(1)
        )
    ).scalar()

    b_income = Decimal("0")
    if user_b_id:
        b_income = (
            await db.execute(
                select(Income.amount)
                .where(Income.household_id == household_id, Income.user_id == user_b_id)
                .order_by(desc(Income.effective_from))
                .limit(1)
            )
        ).scalar() or Decimal("0")

    a = float(a_income or 0)
    b = float(b_income or 0)
    total = a + b
    if total > 0:
        return a / total, b / total
    return 0.5, 0.5


@router.get("/balance", response_model=BalanceResponse)
async def get_balance(
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    a_id = household.user_a_id
    b_id = household.user_b_id
    a_ratio, b_ratio = await _get_split_ratio(household.id, a_id, b_id, db)

    # Sum expenses by split type and payer
    expenses = (
        await db.execute(
            select(
                Expense.paid_by,
                Expense.split_type,
                func.sum(Expense.amount).label("total"),
            )
            .where(Expense.household_id == household.id)
            .group_by(Expense.paid_by, Expense.split_type)
        )
    ).all()

    a_paid = 0.0
    b_paid = 0.0
    a_fair_share = 0.0
    b_fair_share = 0.0

    for row in expenses:
        total = float(row.total)
        payer_is_a = row.paid_by == a_id

        if payer_is_a:
            a_paid += total
        else:
            b_paid += total

        if row.split_type == "shared":
            a_fair_share += total * a_ratio
            b_fair_share += total * b_ratio
        elif row.split_type == "equal":
            a_fair_share += total * 0.5
            b_fair_share += total * 0.5
        elif row.split_type == "personal":
            if payer_is_a:
                a_fair_share += total
            else:
                b_fair_share += total

    # Settlements
    settlements_a_to_b = (
        await db.execute(
            select(func.coalesce(func.sum(Settlement.amount), 0)).where(
                Settlement.household_id == household.id,
                Settlement.from_user == a_id,
            )
        )
    ).scalar() or 0

    settlements_b_to_a = (
        await db.execute(
            select(func.coalesce(func.sum(Settlement.amount), 0)).where(
                Settlement.household_id == household.id,
                Settlement.from_user == (b_id or a_id),
                Settlement.to_user == a_id,
            )
        )
    ).scalar() or 0

    # Net: positive = A owes B
    net = (a_fair_share - a_paid) - float(settlements_a_to_b) + float(settlements_b_to_a)

    return BalanceResponse(
        user_a_id=str(a_id),
        user_b_id=str(b_id) if b_id else None,
        user_a_paid=round(a_paid, 2),
        user_b_paid=round(b_paid, 2),
        user_a_fair_share=round(a_fair_share, 2),
        user_b_fair_share=round(b_fair_share, 2),
        net_balance=round(net, 2),
        settlements_total=round(float(settlements_a_to_b) + float(settlements_b_to_a), 2),
    )


@router.get("/stats/monthly", response_model=MonthlySummary)
async def monthly_stats(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    base = (
        select(Expense)
        .where(
            Expense.household_id == household.id,
            extract("year", Expense.date) == year,
            extract("month", Expense.date) == month,
        )
    )

    expenses = (await db.execute(base)).scalars().all()

    total = sum(float(e.amount) for e in expenses)
    shared = sum(float(e.amount) for e in expenses if e.split_type == "shared")
    personal = sum(float(e.amount) for e in expenses if e.split_type == "personal")
    equal = sum(float(e.amount) for e in expenses if e.split_type == "equal")
    a_paid = sum(float(e.amount) for e in expenses if e.paid_by == household.user_a_id)
    b_paid = total - a_paid

    # By category
    cat_totals: dict[str | None, float] = {}
    cat_names: dict[str | None, str] = {}
    for e in expenses:
        cid = str(e.category_id) if e.category_id else None
        cat_totals[cid] = cat_totals.get(cid, 0) + float(e.amount)

    # Fetch category names
    if cat_totals:
        cats = (
            await db.execute(
                select(Category).where(Category.household_id == household.id)
            )
        ).scalars().all()
        for c in cats:
            cat_names[str(c.id)] = c.name
    cat_names[None] = "Uncategorized"

    by_category = [
        {"category_id": cid, "name": cat_names.get(cid, "Unknown"), "total": round(total_amt, 2)}
        for cid, total_amt in sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)
    ]

    return MonthlySummary(
        year=year,
        month=month,
        total_spent=round(total, 2),
        shared_total=round(shared, 2),
        personal_total=round(personal, 2),
        equal_total=round(equal, 2),
        user_a_paid=round(a_paid, 2),
        user_b_paid=round(b_paid, 2),
        by_category=by_category,
    )


@router.get("/stats/categories", response_model=list[CategorySpending])
async def category_stats(
    year: int | None = Query(None),
    month: int | None = Query(None, ge=1, le=12),
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    query = (
        select(
            Expense.category_id,
            func.sum(Expense.amount).label("total"),
            func.count(Expense.id).label("count"),
        )
        .where(Expense.household_id == household.id)
    )

    if year:
        query = query.where(extract("year", Expense.date) == year)
    if month:
        query = query.where(extract("month", Expense.date) == month)

    query = query.group_by(Expense.category_id).order_by(desc("total"))
    rows = (await db.execute(query)).all()

    # Fetch categories
    cats = (
        await db.execute(
            select(Category).where(Category.household_id == household.id)
        )
    ).scalars().all()
    cat_map = {c.id: c for c in cats}

    results = []
    for row in rows:
        cat = cat_map.get(row.category_id) if row.category_id else None
        results.append(CategorySpending(
            category_id=str(row.category_id) if row.category_id else None,
            category_name=cat.name if cat else "Uncategorized",
            total=round(float(row.total), 2),
            count=row.count,
            budget=float(cat.budget_monthly) if cat and cat.budget_monthly else None,
        ))

    return results


@router.get("/stats/trends", response_model=list[MonthlyTrend])
async def spending_trends(
    months: int = Query(12, ge=1, le=60),
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    rows = (
        await db.execute(
            text("""
                SELECT
                    TO_CHAR(date, 'YYYY-MM') AS month,
                    COALESCE(SUM(amount), 0) AS total,
                    COALESCE(SUM(CASE WHEN split_type = 'shared' THEN amount ELSE 0 END), 0) AS shared,
                    COALESCE(SUM(CASE WHEN split_type = 'personal' THEN amount ELSE 0 END), 0) AS personal
                FROM pairledger.expenses
                WHERE household_id = :hid
                  AND date >= CURRENT_DATE - :months * INTERVAL '1 month'
                GROUP BY TO_CHAR(date, 'YYYY-MM')
                ORDER BY month
            """),
            {"hid": str(household.id), "months": months},
        )
    ).fetchall()

    return [
        MonthlyTrend(
            month=row.month,
            total=round(float(row.total), 2),
            shared=round(float(row.shared), 2),
            personal=round(float(row.personal), 2),
        )
        for row in rows
    ]
