from uuid import UUID
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, extract
from shelf_auth_middleware import get_current_user, ShelfUser

from ..database import get_db
from ..models import Expense, Category
from ..schemas import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseListResponse,
)
from .household import get_user_household

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


def _expense_to_response(e: Expense, cat_name: str | None = None, cat_icon: str | None = None) -> ExpenseResponse:
    return ExpenseResponse(
        id=str(e.id),
        paid_by=str(e.paid_by),
        category_id=str(e.category_id) if e.category_id else None,
        category_name=cat_name,
        category_icon=cat_icon,
        amount=float(e.amount),
        description=e.description,
        date=e.date.isoformat(),
        split_type=e.split_type,
        notes=e.notes,
        tags=e.tags or [],
        receipt_url=e.receipt_url,
        created_at=e.created_at.isoformat(),
    )


@router.get("", response_model=ExpenseListResponse)
async def list_expenses(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    year: int | None = Query(None),
    month: int | None = Query(None, ge=1, le=12),
    category_id: str | None = Query(None),
    paid_by: str | None = Query(None),
    split_type: str | None = Query(None),
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    query = (
        select(Expense, Category.name, Category.icon)
        .outerjoin(Category, Expense.category_id == Category.id)
        .where(Expense.household_id == household.id)
    )
    count_query = select(func.count(Expense.id)).where(Expense.household_id == household.id)

    if year:
        query = query.where(extract("year", Expense.date) == year)
        count_query = count_query.where(extract("year", Expense.date) == year)
    if month:
        query = query.where(extract("month", Expense.date) == month)
        count_query = count_query.where(extract("month", Expense.date) == month)
    if category_id:
        query = query.where(Expense.category_id == UUID(category_id))
        count_query = count_query.where(Expense.category_id == UUID(category_id))
    if paid_by:
        query = query.where(Expense.paid_by == UUID(paid_by))
        count_query = count_query.where(Expense.paid_by == UUID(paid_by))
    if split_type:
        query = query.where(Expense.split_type == split_type)
        count_query = count_query.where(Expense.split_type == split_type)

    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(desc(Expense.date), desc(Expense.created_at))
    query = query.offset((page - 1) * per_page).limit(per_page)
    rows = (await db.execute(query)).all()

    return ExpenseListResponse(
        expenses=[_expense_to_response(row[0], cat_name=row[1], cat_icon=row[2]) for row in rows],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    data: ExpenseCreate,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    paid_by = UUID(data.paid_by) if data.paid_by else uid
    # Verify payer is a household member
    if paid_by not in (household.user_a_id, household.user_b_id):
        raise HTTPException(status_code=400, detail="Payer is not a household member")

    tags = list(dict.fromkeys(t.strip().lower() for t in data.tags if t.strip()))

    expense = Expense(
        household_id=household.id,
        paid_by=paid_by,
        category_id=UUID(data.category_id) if data.category_id else None,
        amount=Decimal(str(data.amount)),
        description=data.description.strip(),
        date=data.date,
        split_type=data.split_type,
        notes=data.notes,
        tags=tags,
        receipt_url=data.receipt_url,
    )
    db.add(expense)
    await db.commit()
    await db.refresh(expense)

    # Fetch category name
    cat_name = None
    cat_icon = None
    if expense.category_id:
        cat = (await db.execute(select(Category).where(Category.id == expense.category_id))).scalar_one_or_none()
        if cat:
            cat_name = cat.name
            cat_icon = cat.icon

    return _expense_to_response(expense, cat_name=cat_name, cat_icon=cat_icon)


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: str,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    row = (
        await db.execute(
            select(Expense, Category.name, Category.icon)
            .outerjoin(Category, Expense.category_id == Category.id)
            .where(Expense.id == UUID(expense_id), Expense.household_id == household.id)
        )
    ).one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="Expense not found")

    return _expense_to_response(row[0], cat_name=row[1], cat_icon=row[2])


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    data: ExpenseUpdate,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    expense = (
        await db.execute(
            select(Expense).where(
                Expense.id == UUID(expense_id),
                Expense.household_id == household.id,
            )
        )
    ).scalar_one_or_none()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    update_data = data.model_dump(exclude_unset=True)

    if "amount" in update_data:
        update_data["amount"] = Decimal(str(update_data["amount"]))
    if "category_id" in update_data and update_data["category_id"]:
        update_data["category_id"] = UUID(update_data["category_id"])
    if "paid_by" in update_data and update_data["paid_by"]:
        update_data["paid_by"] = UUID(update_data["paid_by"])
    if "tags" in update_data and update_data["tags"] is not None:
        update_data["tags"] = list(dict.fromkeys(t.strip().lower() for t in update_data["tags"] if t.strip()))

    for key, value in update_data.items():
        setattr(expense, key, value)

    await db.commit()
    await db.refresh(expense)

    cat_name = None
    cat_icon = None
    if expense.category_id:
        cat = (await db.execute(select(Category).where(Category.id == expense.category_id))).scalar_one_or_none()
        if cat:
            cat_name = cat.name
            cat_icon = cat.icon

    return _expense_to_response(expense, cat_name=cat_name, cat_icon=cat_icon)


@router.delete("/{expense_id}", status_code=204)
async def delete_expense(
    expense_id: str,
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    expense = (
        await db.execute(
            select(Expense).where(
                Expense.id == UUID(expense_id),
                Expense.household_id == household.id,
            )
        )
    ).scalar_one_or_none()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    await db.delete(expense)
    await db.commit()
