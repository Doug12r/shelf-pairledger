from uuid import UUID
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from shelf_auth_middleware import get_current_user, ShelfUser

from ..database import get_db
from ..models import Settlement
from ..schemas import SettlementCreate, SettlementResponse
from .household import get_user_household

router = APIRouter(prefix="/api/settlements", tags=["settlements"])


@router.get("", response_model=list[SettlementResponse])
async def list_settlements(
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    settlements = (
        await db.execute(
            select(Settlement)
            .where(Settlement.household_id == household.id)
            .order_by(desc(Settlement.date), desc(Settlement.created_at))
        )
    ).scalars().all()

    return [
        SettlementResponse(
            id=str(s.id),
            from_user=str(s.from_user),
            to_user=str(s.to_user),
            amount=float(s.amount),
            date=s.date.isoformat(),
            notes=s.notes,
            created_at=s.created_at.isoformat(),
        )
        for s in settlements
    ]


@router.post("", response_model=SettlementResponse, status_code=201)
async def create_settlement(
    data: SettlementCreate,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    from_uid = UUID(data.from_user)
    to_uid = UUID(data.to_user)

    members = {household.user_a_id, household.user_b_id}
    if from_uid not in members or to_uid not in members:
        raise HTTPException(status_code=400, detail="Users must be household members")
    if from_uid == to_uid:
        raise HTTPException(status_code=400, detail="Cannot settle with yourself")

    settlement = Settlement(
        household_id=household.id,
        from_user=from_uid,
        to_user=to_uid,
        amount=Decimal(str(data.amount)),
        date=data.date,
        notes=data.notes,
    )
    db.add(settlement)
    await db.commit()
    await db.refresh(settlement)

    return SettlementResponse(
        id=str(settlement.id),
        from_user=str(settlement.from_user),
        to_user=str(settlement.to_user),
        amount=float(settlement.amount),
        date=settlement.date.isoformat(),
        notes=settlement.notes,
        created_at=settlement.created_at.isoformat(),
    )


@router.delete("/{settlement_id}", status_code=204)
async def delete_settlement(
    settlement_id: str,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    settlement = (
        await db.execute(
            select(Settlement).where(
                Settlement.id == UUID(settlement_id),
                Settlement.household_id == household.id,
            )
        )
    ).scalar_one_or_none()

    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")

    await db.delete(settlement)
    await db.commit()
