from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Listing, Transaction, User
from ..security import get_admin
from ..serializers import listing_out

router = APIRouter(prefix="/api/admin", tags=["admin"])


class RejectIn(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)


def _pending_listing(db: Session, listing_id: int) -> Listing:
    listing = db.scalar(
        select(Listing)
        .options(selectinload(Listing.images), selectinload(Listing.owner))
        .where(Listing.id == listing_id)
    )
    if listing is None:
        raise HTTPException(404, "Không tìm thấy tin đăng")
    if listing.status != "pending":
        raise HTTPException(400, "Tin này không ở trạng thái chờ duyệt")
    return listing


@router.get("/listings")
def admin_listings(status: str = "pending", _: User = Depends(get_admin), db: Session = Depends(get_db)):
    query = select(Listing).options(selectinload(Listing.images), selectinload(Listing.owner))
    if status != "all":
        query = query.where(Listing.status == status)
    rows = db.scalars(query.order_by(Listing.created_at.asc())).all()
    return [listing_out(item, detail=True) for item in rows]


@router.post("/listings/{listing_id}/approve")
def approve(listing_id: int, _: User = Depends(get_admin), db: Session = Depends(get_db)):
    listing = _pending_listing(db, listing_id)
    listing.status = "approved"
    listing.reject_reason = None
    db.commit()
    return listing_out(listing, detail=True)


@router.post("/listings/{listing_id}/reject")
def reject(listing_id: int, body: RejectIn, _: User = Depends(get_admin), db: Session = Depends(get_db)):
    listing = _pending_listing(db, listing_id)
    listing.status = "rejected"
    listing.reject_reason = body.reason.strip()
    db.commit()
    return listing_out(listing, detail=True)


@router.get("/stats")
def stats(_: User = Depends(get_admin), db: Session = Depends(get_db)):
    def grouped(column):
        return {k: v for k, v in db.execute(select(column, func.count()).group_by(column)).all()}

    listing_counts = grouped(Listing.status)
    tx_counts = grouped(Transaction.status)
    return {
        "users": db.scalar(select(func.count(User.id))) or 0,
        "listings_total": sum(listing_counts.values()),
        "listings_by_status": {s: listing_counts.get(s, 0) for s in ("pending", "approved", "rejected", "deposited")},
        "transactions_total": sum(tx_counts.values()),
        "transactions_by_status": {s: tx_counts.get(s, 0) for s in ("pending", "accepted", "rejected", "cancelled")},
        "transactions_by_type": grouped(Transaction.type),
    }
