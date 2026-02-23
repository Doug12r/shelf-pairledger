from uuid import UUID
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from shelf_auth_middleware import get_current_user, ShelfUser

from ..database import get_db
from ..models import Household, Income
from ..schemas import IncomeCreate, IncomeResponse, SplitRatio
from .household import get_user_household

router = APIRouter(prefix="/api/incomes", tags=["incomes"])


@router.get("", response_model=list[IncomeResponse])
async def list_incomes(
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    incomes = (
        await db.execute(
            select(Income)
            .where(Income.household_id == household.id)
            .order_by(desc(Income.effective_from))
        )
    ).scalars().all()

    return [
        IncomeResponse(
            id=str(i.id),
            user_id=str(i.user_id),
            amount=float(i.amount),
            effective_from=i.effective_from.isoformat(),
            notes=i.notes,
            created_at=i.created_at.isoformat(),
        )
        for i in incomes
    ]


@router.post("", response_model=IncomeResponse, status_code=201)
async def create_income(
    data: IncomeCreate,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    income = Income(
        household_id=household.id,
        user_id=uid,
        amount=Decimal(str(data.amount)),
        effective_from=data.effective_from,
        notes=data.notes,
    )
    db.add(income)
    await db.commit()
    await db.refresh(income)

    return IncomeResponse(
        id=str(income.id),
        user_id=str(income.user_id),
        amount=float(income.amount),
        effective_from=income.effective_from.isoformat(),
        notes=income.notes,
        created_at=income.created_at.isoformat(),
    )


@router.delete("/{income_id}", status_code=204)
async def delete_income(
    income_id: str,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    income = (
        await db.execute(
            select(Income).where(
                Income.id == UUID(income_id),
                Income.household_id == household.id,
            )
        )
    ).scalar_one_or_none()

    if not income:
        raise HTTPException(status_code=404, detail="Income not found")

    await db.delete(income)
    await db.commit()


@router.get("/split-ratio", response_model=SplitRatio)
async def get_split_ratio(
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current income split ratio based on latest income entries."""
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    # Get latest income for user_a
    a_income = (
        await db.execute(
            select(Income)
            .where(Income.household_id == household.id, Income.user_id == household.user_a_id)
            .order_by(desc(Income.effective_from))
            .limit(1)
        )
    ).scalar_one_or_none()

    # Get latest income for user_b
    b_income = None
    if household.user_b_id:
        b_income = (
            await db.execute(
                select(Income)
                .where(Income.household_id == household.id, Income.user_id == household.user_b_id)
                .order_by(desc(Income.effective_from))
                .limit(1)
            )
        ).scalar_one_or_none()

    a_amount = float(a_income.amount) if a_income else 0
    b_amount = float(b_income.amount) if b_income else 0
    total = a_amount + b_amount

    if total > 0:
        a_ratio = round(a_amount / total, 4)
        b_ratio = round(b_amount / total, 4)
    else:
        a_ratio = 0.5
        b_ratio = 0.5

    return SplitRatio(
        user_a_id=str(household.user_a_id),
        user_a_income=a_amount,
        user_a_ratio=a_ratio,
        user_b_id=str(household.user_b_id) if household.user_b_id else None,
        user_b_income=b_amount,
        user_b_ratio=b_ratio,
    )
