from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .config import ADMIN_EMAIL, ADMIN_PASSWORD, CORS_ORIGINS
from .database import Base, SessionLocal, engine
from .models import User
from .routers import admin, auth, listings, transactions
from .security import hash_password


def ensure_admin() -> None:
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == ADMIN_EMAIL)) is None:
            db.add(User(
                email=ADMIN_EMAIL,
                full_name="Quản trị viên",
                password_hash=hash_password(ADMIN_PASSWORD),
                role="admin",
            ))
            db.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_admin()
    yield


app = FastAPI(title="BĐS Online API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials="*" not in CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(listings.router)
app.include_router(transactions.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"name": "BĐS Online API", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
