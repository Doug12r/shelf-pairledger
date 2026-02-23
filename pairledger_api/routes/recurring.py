from uuid import UUID
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from shelf_auth_middleware import get_current_user, ShelfUser

from ..database import get_db
from ..models import RecurringExpense, Category
from ..schemas import RecurringCreate, RecurringUpdate, RecurringResponse
from .household import get_user_household

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


def _recurring_to_response(r: RecurringExpense, cat_name: str | None = None) -> RecurringResponse:
    return RecurringResponse(
        id=str(r.id),
        paid_by=str(r.paid_by),
        category_id=str(r.category_id) if r.category_id else None,
        category_name=cat_name,
        amount=float(r.amount),
        description=r.description,
        split_type=r.split_type,
        frequency=r.frequency,
        day_of_month=r.day_of_month,
        active=r.active,
        created_at=r.created_at.isoformat(),
    )


@router.get("", response_model=list[RecurringResponse])
async def list_recurring(
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    rows = (
        await db.execute(
            select(RecurringExpense, Category.name)
            .outerjoin(Category, RecurringExpense.category_id == Category.id)
            .where(RecurringExpense.household_id == household.id)
            .order_by(RecurringExpense.description)
        )
    ).all()

    return [_recurring_to_response(row[0], cat_name=row[1]) for row in rows]


@router.post("", response_model=RecurringResponse, status_code=201)
async def create_recurring(
    data: RecurringCreate,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    paid_by = UUID(data.paid_by) if data.paid_by else uid

    rec = RecurringExpense(
        household_id=household.id,
        paid_by=paid_by,
        category_id=UUID(data.category_id) if data.category_id else None,
        amount=Decimal(str(data.amount)),
        description=data.description.strip(),
        split_type=data.split_type,
        frequency=data.frequency,
        day_of_month=data.day_of_month,
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)

    cat_name = None
    if rec.category_id:
        cat = (await db.execute(select(Category).where(Category.id == rec.category_id))).scalar_one_or_none()
        if cat:
            cat_name = cat.name

    return _recurring_to_response(rec, cat_name=cat_name)


@router.put("/{recurring_id}", response_model=RecurringResponse)
async def update_recurring(
    recurring_id: str,
    data: RecurringUpdate,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    rec = (
        await db.execute(
            select(RecurringExpense).where(
                RecurringExpense.id == UUID(recurring_id),
                RecurringExpense.household_id == household.id,
            )
        )
    ).scalar_one_or_none()

    if not rec:
        raise HTTPException(status_code=404, detail="Recurring expense not found")

    update_data = data.model_dump(exclude_unset=True)
    if "amount" in update_data:
        update_data["amount"] = Decimal(str(update_data["amount"]))
    if "category_id" in update_data and update_data["category_id"]:
        update_data["category_id"] = UUID(update_data["category_id"])
    if "paid_by" in update_data and update_data["paid_by"]:
        update_data["paid_by"] = UUID(update_data["paid_by"])

    for key, value in update_data.items():
        setattr(rec, key, value)

    await db.commit()
    await db.refresh(rec)

    cat_name = None
    if rec.category_id:
        cat = (await db.execute(select(Category).where(Category.id == rec.category_id))).scalar_one_or_none()
        if cat:
            cat_name = cat.name

    return _recurring_to_response(rec, cat_name=cat_name)


@router.delete("/{recurring_id}", status_code=204)
async def delete_recurring(
    recurring_id: str,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    rec = (
        await db.execute(
            select(RecurringExpense).where(
                RecurringExpense.id == UUID(recurring_id),
                RecurringExpense.household_id == household.id,
            )
        )
    ).scalar_one_or_none()

    if not rec:
        raise HTTPException(status_code=404, detail="Recurring expense not found")

    await db.delete(rec)
    await db.commit()
