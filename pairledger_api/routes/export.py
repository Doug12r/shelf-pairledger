import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from shelf_auth_middleware import get_current_user, ShelfUser

from ..database import get_db
from ..models import Household, Income, Category, Expense, Settlement, RecurringExpense
from .household import get_user_household

router = APIRouter(prefix="/api", tags=["export"])


@router.get("/export")
async def export_data(
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export all household data as a JSON file for backup/portability."""
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    hid = household.id

    categories = (await db.execute(select(Category).where(Category.household_id == hid).order_by(Category.name))).scalars().all()
    incomes = (await db.execute(select(Income).where(Income.household_id == hid).order_by(Income.effective_from))).scalars().all()
    expenses = (await db.execute(select(Expense).where(Expense.household_id == hid).order_by(Expense.date))).scalars().all()
    settlements = (await db.execute(select(Settlement).where(Settlement.household_id == hid).order_by(Settlement.date))).scalars().all()
    recurring = (await db.execute(select(RecurringExpense).where(RecurringExpense.household_id == hid))).scalars().all()

    cat_map = {c.id: c.name for c in categories}

    export = {
        "app": "pairledger",
        "version": "1.0.0",
        "household": {
            "name": household.name,
            "user_a_id": str(household.user_a_id),
            "user_b_id": str(household.user_b_id) if household.user_b_id else None,
        },
        "categories": [
            {
                "name": c.name,
                "icon": c.icon,
                "color": c.color,
                "budget_monthly": float(c.budget_monthly) if c.budget_monthly else None,
            }
            for c in categories
        ],
        "incomes": [
            {
                "user_id": str(i.user_id),
                "amount": float(i.amount),
                "effective_from": i.effective_from.isoformat(),
                "notes": i.notes,
            }
            for i in incomes
        ],
        "expenses": [
            {
                "paid_by": str(e.paid_by),
                "category": cat_map.get(e.category_id, None),
                "amount": float(e.amount),
                "description": e.description,
                "date": e.date.isoformat(),
                "split_type": e.split_type,
                "notes": e.notes,
                "tags": e.tags or [],
            }
            for e in expenses
        ],
        "settlements": [
            {
                "from_user": str(s.from_user),
                "to_user": str(s.to_user),
                "amount": float(s.amount),
                "date": s.date.isoformat(),
                "notes": s.notes,
            }
            for s in settlements
        ],
        "recurring_expenses": [
            {
                "paid_by": str(r.paid_by),
                "category": cat_map.get(r.category_id, None),
                "amount": float(r.amount),
                "description": r.description,
                "split_type": r.split_type,
                "frequency": r.frequency,
                "day_of_month": r.day_of_month,
                "active": r.active,
            }
            for r in recurring
        ],
    }

    content = json.dumps(export, indent=2, default=str)
    return StreamingResponse(
        iter([content]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=pairledger-export.json"},
    )
