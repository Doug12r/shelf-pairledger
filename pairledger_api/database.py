from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

from .config import settings

# Ensure the URL uses the asyncpg driver
db_url = settings.db_url
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(db_url, pool_size=settings.db_pool_size, max_overflow=settings.db_max_overflow)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        await session.execute(text("SET search_path TO pairledger, public"))
        yield session


async def ensure_schema():
    """Create the pairledger schema if it doesn't exist."""
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS pairledger"))
