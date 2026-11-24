from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Listing, Transaction, User
from ..security import get_current_user
from ..serializers import transaction_out

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


class TransactionIn(BaseModel):
    listing_id: int
    type: str = Field(pattern="^(contact|deposit)$")
    message: str = Field(default="", max_length=2000)
    phone: str = Field(min_length=8, max_length=30)
    viewing_date: date | None = None
    deposit_amount: int | None = Field(default=None, gt=0)


def _load_options():
    return (
        selectinload(Transaction.listing).selectinload(Listing.owner),
        selectinload(Transaction.buyer),
    )


def _get_tx(db: Session, tx_id: int) -> Transaction:
    tx = db.scalar(select(Transaction).options(*_load_options()).where(Transaction.id == tx_id))
    if tx is None:
        raise HTTPException(404, "Không tìm thấy giao dịch")
    return tx


@router.post("", status_code=201)
def create_transaction(body: TransactionIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    listing = db.get(Listing, body.listing_id)
    if listing is None or listing.status not in ("approved", "deposited"):
        raise HTTPException(404, "Không tìm thấy tin đăng")
    if listing.owner_id == user.id:
        raise HTTPException(400, "Bạn không thể gửi yêu cầu cho tin của chính mình")
    if body.type == "deposit":
        if listing.status != "approved":
            raise HTTPException(400, "Tin này đã được đặt cọc")
        if not body.deposit_amount:
            raise HTTPException(400, "Vui lòng nhập số tiền đặt cọc")
        if body.deposit_amount > listing.price:
            raise HTTPException(400, "Số tiền đặt cọc không được vượt quá giá")
    tx = Transaction(
        listing_id=listing.id,
        buyer_id=user.id,
        type=body.type,
        message=body.message.strip(),
        phone=body.phone.strip(),
        viewing_date=body.viewing_date if body.type == "contact" else None,
        deposit_amount=body.deposit_amount if body.type == "deposit" else None,
        status="pending",
    )
    db.add(tx)
    db.commit()
    return transaction_out(_get_tx(db, tx.id))


@router.get("/sent")
def sent(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Transaction).options(*_load_options())
        .where(Transaction.buyer_id == user.id)
        .order_by(Transaction.created_at.desc())
    ).all()
    return [transaction_out(t) for t in rows]


@router.get("/received")
def received(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Transaction).options(*_load_options())
        .join(Listing, Transaction.listing_id == Listing.id)
        .where(Listing.owner_id == user.id)
        .order_by(Transaction.created_at.desc())
    ).all()
    return [transaction_out(t) for t in rows]


def _owner_pending_tx(db: Session, tx_id: int, user: User) -> Transaction:
    tx = _get_tx(db, tx_id)
    if tx.listing.owner_id != user.id:
        raise HTTPException(403, "Bạn không có quyền xử lý yêu cầu này")
    if tx.status != "pending":
        raise HTTPException(400, "Yêu cầu này đã được xử lý")
    return tx


@router.post("/{tx_id}/accept")
def accept(tx_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tx = _owner_pending_tx(db, tx_id, user)
    if tx.type == "deposit":
        if tx.listing.status != "approved":
            raise HTTPException(400, "Tin này không còn nhận đặt cọc")
        tx.listing.status = "deposited"
        others = db.scalars(
            select(Transaction).where(
                Transaction.listing_id == tx.listing_id,
                Transaction.type == "deposit",
                Transaction.status == "pending",
                Transaction.id != tx.id,
            )
        ).all()
        for other in others:
            other.status = "rejected"
    tx.status = "accepted"
    db.commit()
    return transaction_out(_get_tx(db, tx.id))


@router.post("/{tx_id}/reject")
def reject(tx_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tx = _owner_pending_tx(db, tx_id, user)
    tx.status = "rejected"
    db.commit()
    return transaction_out(_get_tx(db, tx.id))


@router.post("/{tx_id}/cancel")
def cancel(tx_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tx = _get_tx(db, tx_id)
    if tx.buyer_id != user.id:
        raise HTTPException(403, "Bạn không có quyền hủy yêu cầu này")
    if tx.status != "pending":
        raise HTTPException(400, "Chỉ hủy được yêu cầu đang chờ xử lý")
    tx.status = "cancelled"
    db.commit()
    return transaction_out(_get_tx(db, tx.id))
