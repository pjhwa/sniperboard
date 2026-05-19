from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.endpoints import router

app = FastAPI(
    title="Lazy Alpha Signal API",
    description="Trading signal dashboard backend",
    version="0.1.0"
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
    return {"message": "Lazy Alpha Signal Dashboard API is running"}