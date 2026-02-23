import asyncio
import json
import logging
import subprocess
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from .config import settings
from .database import engine, async_session, ensure_schema
from .routes.household import router as household_router
from .routes.incomes import router as incomes_router
from .routes.categories import router as categories_router
from .routes.expenses import router as expenses_router
from .routes.recurring import router as recurring_router
from .routes.settlements import router as settlements_router
from .routes.balance import router as balance_router
from .routes.search import router as search_router
from .routes.export import router as export_router


# ── Structured JSON logging ─────────────────────────────────────────────

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps({
            "ts": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        })


handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JSONFormatter())
log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
logging.basicConfig(level=log_level, handlers=[handler], force=True)
logger = logging.getLogger("pairledger")

STATIC_DIR = Path(__file__).parent.parent / "static"


# ── DB startup helpers ───────────────────────────────────────────────────

async def wait_for_db(retries: int = 15, delay: float = 2.0) -> None:
    """Wait for PostgreSQL to become reachable before proceeding."""
    for attempt in range(retries):
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            return
        except Exception:
            if attempt < retries - 1:
                logger.info(f"DB not ready, retrying in {delay}s... ({attempt + 1}/{retries})")
                await asyncio.sleep(delay)
            else:
                logger.error("Could not connect to database after %d attempts", retries)
                raise


def run_migrations() -> None:
    """Run alembic upgrade head to apply any pending migrations."""
    result = subprocess.run(
        ["alembic", "upgrade", "head"],
        capture_output=True, text=True, cwd=str(Path(__file__).parent.parent),
    )
    if result.returncode != 0:
        logger.error("Migration failed: %s", result.stderr)
        raise RuntimeError(f"Alembic migration failed: {result.stderr}")
    logger.info("Database migrations applied successfully")


# ── Lifespan ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting PairLedger...")
    await wait_for_db()
    await ensure_schema()
    run_migrations()
    logger.info("PairLedger ready")
    yield
    logger.info("PairLedger shutting down")


# ── App ──────────────────────────────────────────────────────────────────

app = FastAPI(title="PairLedger", lifespan=lifespan)

app.include_router(household_router)
app.include_router(incomes_router)
app.include_router(categories_router)
app.include_router(expenses_router)
app.include_router(recurring_router)
app.include_router(settlements_router)
app.include_router(balance_router)
app.include_router(search_router)
app.include_router(export_router)


# ── Global exception handlers ────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()},
    )


# ── Health check with DB ping ────────────────────────────────────────────

@app.get("/health")
async def health():
    db_ok = False
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        pass

    return {
        "status": "ok" if db_ok else "degraded",
        "version": "1.0.0",
        "app": "pairledger",
        "db": db_ok,
    }


# ── Serve React SPA ─────────────────────────────────────────────────────

if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
