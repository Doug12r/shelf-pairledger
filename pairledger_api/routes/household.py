import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from shelf_auth_middleware import get_current_user, ShelfUser

from ..database import get_db
from ..models import Household
from ..schemas import HouseholdCreate, HouseholdJoin, HouseholdResponse

router = APIRouter(prefix="/api/household", tags=["household"])


def _generate_invite_code() -> str:
    return secrets.token_urlsafe(6)[:8].upper()


async def get_user_household(user_id: UUID, db: AsyncSession) -> Household | None:
    """Get the household for a user (either as user_a or user_b)."""
    result = await db.execute(
        select(Household).where(
            or_(Household.user_a_id == user_id, Household.user_b_id == user_id)
        )
    )
    return result.scalar_one_or_none()


def _household_to_response(h: Household) -> HouseholdResponse:
    return HouseholdResponse(
        id=str(h.id),
        name=h.name,
        invite_code=h.invite_code,
        user_a_id=str(h.user_a_id),
        user_b_id=str(h.user_b_id) if h.user_b_id else None,
        created_at=h.created_at.isoformat(),
    )


@router.get("", response_model=HouseholdResponse | None)
async def get_household(
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        return None
    return _household_to_response(household)


@router.post("", response_model=HouseholdResponse, status_code=201)
async def create_household(
    data: HouseholdCreate,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)

    # Check if user already has a household
    existing = await get_user_household(uid, db)
    if existing:
        raise HTTPException(status_code=409, detail="You already belong to a household")

    household = Household(
        name=data.name.strip(),
        invite_code=_generate_invite_code(),
        user_a_id=uid,
    )
    db.add(household)
    await db.commit()
    await db.refresh(household)

    return _household_to_response(household)


@router.post("/join", response_model=HouseholdResponse)
async def join_household(
    data: HouseholdJoin,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)

    # Check if user already has a household
    existing = await get_user_household(uid, db)
    if existing:
        raise HTTPException(status_code=409, detail="You already belong to a household")

    # Find household by invite code
    household = (
        await db.execute(
            select(Household).where(Household.invite_code == data.invite_code.strip().upper())
        )
    ).scalar_one_or_none()

    if not household:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    if household.user_b_id is not None:
        raise HTTPException(status_code=409, detail="This household already has two members")

    if household.user_a_id == uid:
        raise HTTPException(status_code=400, detail="You cannot join your own household")

    household.user_b_id = uid
    await db.commit()
    await db.refresh(household)

    return _household_to_response(household)


@router.put("", response_model=HouseholdResponse)
async def update_household(
    data: HouseholdCreate,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    household.name = data.name.strip()
    await db.commit()
    await db.refresh(household)

    return _household_to_response(household)


@router.post("/regenerate-invite", response_model=HouseholdResponse)
async def regenerate_invite(
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    household.invite_code = _generate_invite_code()
    await db.commit()
    await db.refresh(household)

    return _household_to_response(household)
