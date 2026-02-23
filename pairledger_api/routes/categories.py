from uuid import UUID
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from shelf_auth_middleware import get_current_user, ShelfUser

from ..database import get_db
from ..models import Category
from ..schemas import CategoryCreate, CategoryUpdate, CategoryResponse
from .household import get_user_household

router = APIRouter(prefix="/api/categories", tags=["categories"])


def _cat_to_response(c: Category) -> CategoryResponse:
    return CategoryResponse(
        id=str(c.id),
        name=c.name,
        icon=c.icon,
        color=c.color,
        budget_monthly=float(c.budget_monthly) if c.budget_monthly else None,
        created_at=c.created_at.isoformat(),
    )


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    cats = (
        await db.execute(
            select(Category)
            .where(Category.household_id == household.id)
            .order_by(Category.name)
        )
    ).scalars().all()

    return [_cat_to_response(c) for c in cats]


@router.post("", response_model=CategoryResponse, status_code=201)
async def create_category(
    data: CategoryCreate,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    cat = Category(
        household_id=household.id,
        name=data.name.strip(),
        icon=data.icon,
        color=data.color,
        budget_monthly=Decimal(str(data.budget_monthly)) if data.budget_monthly else None,
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)

    return _cat_to_response(cat)


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    cat = (
        await db.execute(
            select(Category).where(
                Category.id == UUID(category_id),
                Category.household_id == household.id,
            )
        )
    ).scalar_one_or_none()

    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = data.model_dump(exclude_unset=True)
    if "budget_monthly" in update_data and update_data["budget_monthly"] is not None:
        update_data["budget_monthly"] = Decimal(str(update_data["budget_monthly"]))

    for key, value in update_data.items():
        setattr(cat, key, value)

    await db.commit()
    await db.refresh(cat)

    return _cat_to_response(cat)


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: str,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    cat = (
        await db.execute(
            select(Category).where(
                Category.id == UUID(category_id),
                Category.household_id == household.id,
            )
        )
    ).scalar_one_or_none()

    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    await db.delete(cat)
    await db.commit()
