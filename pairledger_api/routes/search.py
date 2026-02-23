from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from shelf_auth_middleware import get_current_user, ShelfUser

from ..database import get_db
from ..schemas import SearchResult
from .household import get_user_household

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search", response_model=list[SearchResult])
async def search_expenses(
    q: str = Query(..., min_length=1, max_length=500),
    limit: int = Query(20, ge=1, le=100),
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
                    id, description, amount, date, paid_by,
                    ts_headline('english',
                        coalesce(description, '') || ' — ' || coalesce(notes, ''),
                        plainto_tsquery('english', :query),
                        'MaxWords=30, MinWords=10, StartSel=**, StopSel=**'
                    ) AS snippet,
                    ts_rank(
                        to_tsvector('english', coalesce(description, '') || ' ' || coalesce(notes, '')),
                        plainto_tsquery('english', :query)
                    ) AS rank
                FROM pairledger.expenses
                WHERE household_id = :hid
                  AND to_tsvector('english', coalesce(description, '') || ' ' || coalesce(notes, ''))
                      @@ plainto_tsquery('english', :query)
                ORDER BY rank DESC
                LIMIT :limit
            """),
            {"query": q, "hid": str(household.id), "limit": limit},
        )
    ).fetchall()

    return [
        SearchResult(
            id=str(row.id),
            description=row.description,
            amount=float(row.amount),
            date=row.date.isoformat(),
            paid_by=str(row.paid_by),
            snippet=row.snippet or "",
        )
        for row in rows
    ]


@router.get("/tags", response_model=list[str])
async def list_tags(
    user: ShelfUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = UUID(user.id)
    household = await get_user_household(uid, db)
    if not household:
        raise HTTPException(status_code=404, detail="No household found")

    result = await db.execute(
        text("""
            SELECT DISTINCT unnest(tags) AS tag
            FROM pairledger.expenses
            WHERE household_id = :hid
            ORDER BY tag
        """),
        {"hid": str(household.id)},
    )
    return [row.tag for row in result.fetchall()]
