from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.endpoints import router, WATCHLIST_SYMS
from services.overnight_service import start_overnight_service

# SYMBOLS that need overnight price: watchlist + macro index ETFs shown in MarketStrip
_OVERNIGHT_SYMBOLS = list(dict.fromkeys(WATCHLIST_SYMS + ["SPY", "QQQ", "IWM"]))


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_overnight_service(_OVERNIGHT_SYMBOLS)
    yield


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