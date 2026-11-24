import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..security import create_token, get_current_user, hash_password, verify_password
from ..serializers import user_out

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterIn(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(min_length=6, max_length=100)
    full_name: str = Field(min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=30)


class LoginIn(BaseModel):
    email: str
    password: str


def _auth_response(user: User) -> dict:
    return {"access_token": create_token(user), "token_type": "bearer", "user": user_out(user)}


@router.post("/register", status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "Email không hợp lệ")
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(400, "Email đã được sử dụng")
    user = User(
        email=email,
        full_name=body.full_name.strip(),
        phone=(body.phone or "").strip() or None,
        password_hash=hash_password(body.password),
        role="user",
    )
    db.add(user)
    db.commit()
    return _auth_response(user)


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Email hoặc mật khẩu không đúng")
    return _auth_response(user)


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return user_out(user)
