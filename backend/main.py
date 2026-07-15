import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.executors.pool import ThreadPoolExecutor
from api.endpoints import router, WATCHLIST_SYMS, build_watchlist_result
from services.overnight_service import start_overnight_service
from core.signal_tracker import init_db as init_signal_db, scan_and_log, update_outcomes
from core.cap_rank_tracker import init_db as init_cap_db
from services.email_report_service import run_morning_report

# Ensure lifespan / APScheduler lines appear in `docker logs` (uvicorn default config)
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s:%(name)s:%(message)s",
    stream=sys.stdout,
    force=True,
)
logger = logging.getLogger(__name__)

# SYMBOLS that need overnight price: watchlist + macro index ETFs shown in MarketStrip
_OVERNIGHT_SYMBOLS = list(dict.fromkeys(WATCHLIST_SYMS + ["SPY", "QQQ", "IWM"]))
_scheduler = AsyncIOScheduler(
    timezone="Asia/Seoul",
    executors={"threadpool": ThreadPoolExecutor(max_workers=2)},
)


def run_signal_scan():
    """장 중 자동 신호 스캔 — 30분마다 실행."""
    try:
        result, regime_label = build_watchlist_result()
        logged = scan_and_log(result, regime=regime_label)
        logger.info(f"Scheduled signal scan complete — {logged} new signal(s) logged.")
    except Exception as e:
        logger.error(f"Scheduled signal scan failed: {e}", exc_info=True)


def run_outcome_update():
    """장 마감 후 결과 업데이트 — PENDING/ACTIVE 신호 WIN/LOSS/TIMEOUT 갱신."""
    try:
        summary = update_outcomes()
        logger.info(f"Scheduled outcome update complete — {summary}")
    except Exception as e:
        logger.error(f"Scheduled outcome update failed: {e}", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_signal_db()
    init_cap_db()
    start_overnight_service(_OVERNIGHT_SYMBOLS)

    # Clear stale PENDING/ACTIVE on boot so Track board and health stay trustworthy
    try:
        boot_summary = update_outcomes()
        logger.info("Startup outcome update complete — %s", boot_summary)
    except Exception as e:
        logger.error("Startup outcome update failed: %s", e, exc_info=True)

    _scheduler.add_job(
        run_morning_report,
        CronTrigger(hour=7, minute=30, timezone="Asia/Seoul"),
        id="morning_email_report",
        replace_existing=True,
        executor="threadpool",
    )

    # 미국 장 중 (ET 9:30~16:00 = KST 22:30~05:00) 30분마다 신호 스캔
    # CronTrigger: KST 22:30 ~ 05:00, 매 30분 (분: 0,30)
    _scheduler.add_job(
        run_signal_scan,
        CronTrigger(
            hour="22-23,0-4",
            minute="0,30",
            timezone="Asia/Seoul",
        ),
        id="signal_scan",
        replace_existing=True,
        executor="threadpool",
    )

    # 장 마감 30분 후 (ET 16:30 = KST 05:30) 결과 업데이트
    _scheduler.add_job(
        run_outcome_update,
        CronTrigger(hour=5, minute=30, timezone="Asia/Seoul"),
        id="outcome_update",
        replace_existing=True,
        executor="threadpool",
    )

    _scheduler.start()
    logger.info(
        "APScheduler started — morning report KST 07:30, "
        "signal scan KST 22:30~05:00 every 30min, "
        "outcome update KST 05:30."
    )

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
