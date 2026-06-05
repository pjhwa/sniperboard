import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from api.endpoints import router, WATCHLIST_SYMS
from services.overnight_service import start_overnight_service
from core.signal_tracker import init_db
from services.email_report_service import run_morning_report

logger = logging.getLogger(__name__)

# SYMBOLS that need overnight price: watchlist + macro index ETFs shown in MarketStrip
_OVERNIGHT_SYMBOLS = list(dict.fromkeys(WATCHLIST_SYMS + ["SPY", "QQQ", "IWM"]))
_scheduler = AsyncIOScheduler(timezone="Asia/Seoul")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_overnight_service(_OVERNIGHT_SYMBOLS)

    _scheduler.add_job(
        run_morning_report,
        CronTrigger(hour=7, minute=30, timezone="Asia/Seoul"),
        id="morning_email_report",
        replace_existing=True,
        executor="threadpool",
    )
    _scheduler.start()
    logger.info("APScheduler started — morning report scheduled at KST 07:30.")

    yield

    _scheduler.shutdown(wait=False)


app = FastAPI(
    title="SniperBoard Signal API",
    description="Trading signal dashboard backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 설정 - 개발용 (모든 origin 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {"message": "SniperBoard Signal Dashboard API is running"}
